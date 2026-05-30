/**
 * @file export.c
 * @brief brass-audio FFI exports for Windows (miniaudio engine)
 *
 * All functions return int handles (>=0) for sound references.
 * Handles are valid until audio_uninit() or audio_unload().
 */

#if defined(_WIN32) || defined(_WIN64)
#if defined(BUILD_SHARED)
#define API_EXPORT __declspec(dllexport)
#else
#define API_EXPORT __declspec(dllimport)
#endif
#elif defined(__GNUC__) && __GNUC__ >= 4
#define API_EXPORT __attribute__((visibility("default")))
#elif defined(__SUNPRO_C) || defined(__SUNPRO_CC)
#define API_EXPORT __global
#else
#define API_EXPORT
#endif

#define MINIAUDIO_IMPLEMENTATION
#include "./miniaudio.h"

#include <string.h>
#include <stdlib.h>

#define MAX_SOUNDS 64

static ma_engine g_engine;
static int g_initialized = 0;
static ma_sound g_sounds[MAX_SOUNDS];
static int g_sound_count = 0;

/* ─── 内部：一次性音源自动清理 ──────────────────────────── */

#define MAX_ONE_SHOTS 256

static ma_sound g_one_shots[MAX_ONE_SHOTS];
static int g_one_shot_count = 0;

static void cleanup_one_shots(void)
{
    for (int i = g_one_shot_count - 1; i >= 0; i--) {
        if (ma_sound_at_end(&g_one_shots[i])) {
            ma_sound_uninit(&g_one_shots[i]);
            if (i < g_one_shot_count - 1)
                g_one_shots[i] = g_one_shots[g_one_shot_count - 1];
            g_one_shot_count--;
        }
    }
}

static int find_one_shot_slot(void)
{
    for (int i = 0; i < g_one_shot_count; i++) {
        if (ma_sound_at_end(&g_one_shots[i])) {
            ma_sound_uninit(&g_one_shots[i]);
            if (i < g_one_shot_count - 1)
                g_one_shots[i] = g_one_shots[g_one_shot_count - 1];
            g_one_shot_count--;
            return i;
        }
    }
    if (g_one_shot_count < MAX_ONE_SHOTS)
        return g_one_shot_count++;
    return -1;
}

/* ─── 引擎生命周期 ───────────────────────────────────── */

/**
 * @brief 初始化音频引擎
 * @param sampleRate            采样率 (Hz)，如 44100、48000
 * @param channels              输出通道数 (1=单声道, 2=立体声, 6=5.1)
 * @param periodSizeInFrames    每次回调的帧数 (越小延迟越低，建议 256~1024)
 * @return 0 成功，-1 失败
 */
API_EXPORT int audio_init(int sampleRate, int channels, int periodSizeInFrames)
{
    if (g_initialized) return 0;

    ma_engine_config config = ma_engine_config_init();
    config.sampleRate        = sampleRate;
    config.channels          = channels;
    config.periodSizeInFrames = periodSizeInFrames;

    if (ma_engine_init(&config, &g_engine) != MA_SUCCESS)
        return -1;

    memset(g_sounds, 0, sizeof(g_sounds));
    memset(g_one_shots, 0, sizeof(g_one_shots));
    g_sound_count = 0;
    g_one_shot_count = 0;
    g_initialized = 1;
    return 0;
}

/**
 * @brief 销毁引擎，释放所有资源
 */
API_EXPORT void audio_uninit(void)
{
    if (!g_initialized) return;

    for (int i = 0; i < g_sound_count; i++)
        ma_sound_uninit(&g_sounds[i]);

    for (int i = 0; i < g_one_shot_count; i++)
        ma_sound_uninit(&g_one_shots[i]);

    ma_engine_uninit(&g_engine);
    g_initialized = 0;
    g_sound_count = 0;
    g_one_shot_count = 0;
}

/* ─── 引擎状态查询 ──────────────────────────────────── */

/**
 * @brief 获取引擎输出通道数
 * @return 通道数（初始化时设定的 channels 值）
 */
API_EXPORT int audio_get_channels(void)
{
    if (!g_initialized) return 0;
    return (int)ma_engine_get_channels(&g_engine);
}

/**
 * @brief 获取引擎采样率
 * @return 采样率 (Hz)
 */
API_EXPORT int audio_get_sample_rate(void)
{
    if (!g_initialized) return 0;
    return (int)ma_engine_get_sample_rate(&g_engine);
}

/**
 * @brief 获取引擎全局时间（PCM 帧数）
 * @return 从引擎启动到当前的总 PCM 帧数
 */
API_EXPORT long long audio_get_engine_time_in_pcm_frames(void)
{
    if (!g_initialized) return 0;
    return (long long)ma_engine_get_time_in_pcm_frames(&g_engine);
}

/**
 * @brief 获取引擎全局时间（毫秒）
 * @return 从引擎启动到当前的总毫秒数
 */
API_EXPORT long long audio_get_engine_time_in_milliseconds(void)
{
    if (!g_initialized) return 0;
    return (long long)ma_engine_get_time_in_milliseconds(&g_engine);
}

/**
 * @brief 设置引擎全局时间（PCM 帧数）
 * @param globalTime PCM 帧数
 */
API_EXPORT void audio_set_engine_time_in_pcm_frames(long long globalTime)
{
    if (!g_initialized) return;
    ma_engine_set_time_in_pcm_frames(&g_engine, (ma_uint64)globalTime);
}

/**
 * @brief 获取全局音量
 * @return 当前全局音量 (0.0 ~ 1.0)
 */
API_EXPORT float audio_get_master_volume(void)
{
    if (!g_initialized) return 0.0f;
    return ma_engine_get_volume(&g_engine);
}

/**
 * @brief 设置全局音量
 * @param volume 音量 (0.0 ~ 1.0，可大于 1.0 用于增益)
 */
API_EXPORT void audio_set_master_volume(float volume)
{
    if (!g_initialized) return;
    ma_engine_set_volume(&g_engine, volume);
}

/* ─── 音源加载/卸载 ──────────────────────────────────── */

/**
 * @brief 加载音频文件
 * @param path 文件路径（支持 wav/mp3/flac/ogg 等格式）
 * @return 音源句柄 (>=0)，失败返回 -1
 */
API_EXPORT int audio_load(const char* path)
{
    if (!g_initialized) return -1;
    if (g_sound_count >= MAX_SOUNDS) return -1;

    int idx = g_sound_count;
    if (ma_sound_init_from_file(&g_engine, path, 0, NULL, NULL, &g_sounds[idx]) != MA_SUCCESS)
        return -1;

    g_sound_count++;
    return idx;
}

/**
 * @brief 卸载音源
 * @param handle 音源句柄
 */
API_EXPORT void audio_unload(int handle)
{
    if (handle < 0 || handle >= g_sound_count) return;
    ma_sound_uninit(&g_sounds[handle]);

    /* swap-with-last 避免碎片 */
    if (handle < g_sound_count - 1)
        g_sounds[handle] = g_sounds[g_sound_count - 1];

    g_sound_count--;
}

/* ─── 音源信息查询 ──────────────────────────────────── */

/**
 * @brief 获取音源音频格式信息
 * @param handle     音源句柄
 * @param[out] format      输出采样格式 (0=unknown, 1=u8, 2=s16, 3=s24, 4=s32, 5=f32)
 * @param[out] channels    输出通道数
 * @param[out] sampleRate  输出采样率
 * @return 0 成功，-1 失败
 */
API_EXPORT int audio_get_sound_format(int handle, int* format, int* channels, int* sampleRate)
{
    if (handle < 0 || handle >= g_sound_count) return -1;

    ma_format fmt;
    ma_uint32 ch, sr;
    ma_channel channelMap[MA_MAX_CHANNELS];

    if (ma_sound_get_data_format(&g_sounds[handle], &fmt, &ch, &sr, channelMap, sizeof(channelMap)) != MA_SUCCESS)
        return -1;

    if (format)     *format     = (int)fmt;
    if (channels)   *channels   = (int)ch;
    if (sampleRate) *sampleRate = (int)sr;
    return 0;
}

/* ─── 播放控制 ──────────────────────────────────────── */

/**
 * @brief 播放音源（从当前位置开始）
 * @param handle 音源句柄
 */
API_EXPORT void audio_play(int handle)
{
    if (handle < 0 || handle >= g_sound_count) return;
    ma_sound_start(&g_sounds[handle]);
}

/**
 * @brief 停止音源
 * @param handle 音源句柄
 */
API_EXPORT void audio_stop(int handle)
{
    if (handle < 0 || handle >= g_sound_count) return;
    ma_sound_stop(&g_sounds[handle]);
}

/**
 * @brief 查询音源是否正在播放
 * @param handle 音源句柄
 * @return 1 播放中，0 未播放
 */
API_EXPORT int audio_is_playing(int handle)
{
    if (handle < 0 || handle >= g_sound_count) return 0;
    return ma_sound_is_playing(&g_sounds[handle]) ? 1 : 0;
}

/**
 * @brief 查询音源是否已到达结尾
 * @param handle 音源句柄
 * @return 1 已播完，0 未播完
 */
API_EXPORT int audio_is_at_end(int handle)
{
    if (handle < 0 || handle >= g_sound_count) return 0;
    return ma_sound_at_end(&g_sounds[handle]) ? 1 : 0;
}

/**
 * @brief 查询音源是否循环
 * @param handle 音源句柄
 * @return 1 循环，0 不循环
 */
API_EXPORT int audio_is_looping(int handle)
{
    if (handle < 0 || handle >= g_sound_count) return 0;
    return ma_sound_is_looping(&g_sounds[handle]) ? 1 : 0;
}

/* ─── 音源参数控制 ──────────────────────────────────── */

/**
 * @brief 设置音量
 * @param handle 音源句柄
 * @param volume 音量 (0.0 = 静音, 1.0 = 原声, 可 >1.0 增益)
 */
API_EXPORT void audio_set_volume(int handle, float volume)
{
    if (handle < 0 || handle >= g_sound_count) return;
    ma_sound_set_volume(&g_sounds[handle], volume);
}

/**
 * @brief 设置声像
 * @param handle 音源句柄
 * @param pan 声像 (-1.0 全左, 0.0 居中, 1.0 全右)
 */
API_EXPORT void audio_set_pan(int handle, float pan)
{
    if (handle < 0 || handle >= g_sound_count) return;
    ma_sound_set_pan(&g_sounds[handle], pan);
}

/**
 * @brief 设置音高倍率
 * @param handle 音源句柄
 * @param pitch 音高倍率 (1.0 = 原速, 2.0 = 翻倍速度/音高)
 */
API_EXPORT void audio_set_pitch(int handle, float pitch)
{
    if (handle < 0 || handle >= g_sound_count) return;
    ma_sound_set_pitch(&g_sounds[handle], pitch);
}

/**
 * @brief 设置是否循环播放
 * @param handle 音源句柄
 * @param looping 1 循环，0 不循环
 */
API_EXPORT void audio_set_looping(int handle, int looping)
{
    if (handle < 0 || handle >= g_sound_count) return;
    ma_sound_set_looping(&g_sounds[handle], looping ? MA_TRUE : MA_FALSE);
}

/* ─── 淡入淡出 ──────────────────────────────────────── */

/**
 * @brief 设置淡入淡出（毫秒）
 * @param handle              音源句柄
 * @param volumeBeg           起始音量（-1 表示使用当前音量）
 * @param volumeEnd           结束音量
 * @param fadeLengthMs        淡变时长 (毫秒)
 */
API_EXPORT void audio_set_fade_in_milliseconds(int handle, float volumeBeg, float volumeEnd, long long fadeLengthMs)
{
    if (handle < 0 || handle >= g_sound_count) return;
    ma_sound_set_fade_in_milliseconds(&g_sounds[handle], volumeBeg, volumeEnd, (ma_uint64)fadeLengthMs);
}

/* ─── 定时停止 ──────────────────────────────────────── */

/**
 * @brief 设置在指定引擎全局时间停止播放
 * @param handle          音源句柄
 * @param stopTimeMs      停止时的引擎全局时间 (毫秒)
 */
API_EXPORT void audio_set_stop_time_in_milliseconds(int handle, long long stopTimeMs)
{
    if (handle < 0 || handle >= g_sound_count) return;
    ma_sound_set_stop_time_in_milliseconds(&g_sounds[handle], (ma_uint64)stopTimeMs);
}

/**
 * @brief 停止并带淡出
 * @param handle        音源句柄
 * @param fadeLengthMs  淡出时长 (毫秒)
 */
API_EXPORT void audio_stop_with_fade_in_milliseconds(int handle, long long fadeLengthMs)
{
    if (handle < 0 || handle >= g_sound_count) return;

    ma_uint64 now   = ma_engine_get_time_in_pcm_frames(&g_engine);
    ma_uint32 sr    = ma_engine_get_sample_rate(&g_engine);
    ma_uint64 fade  = (ma_uint64)(fadeLengthMs * sr / 1000);

    ma_sound_set_stop_time_with_fade_in_pcm_frames(&g_sounds[handle], now + fade, fade);
}

/* ─── 跳转与定位 ────────────────────────────────────── */

/**
 * @brief 跳转到指定 PCM 帧
 * @param handle 音源句柄
 * @param frame  目标 PCM 帧位置
 */
API_EXPORT void audio_seek(int handle, long long frame)
{
    if (handle < 0 || handle >= g_sound_count) return;
    ma_sound_seek_to_pcm_frame(&g_sounds[handle], (ma_uint64)frame);
}

/**
 * @brief 设置开始时间（引擎全局时间）
 * @param handle          音源句柄
 * @param startTimeMs     开始播放的引擎全局时间 (毫秒)
 */
API_EXPORT void audio_set_start_time_in_milliseconds(int handle, long long startTimeMs)
{
    if (handle < 0 || handle >= g_sound_count) return;
    ma_sound_set_start_time_in_milliseconds(&g_sounds[handle], (ma_uint64)startTimeMs);
}

/**
 * @brief 获取当前播放位置（PCM 帧数）
 * @param handle 音源句柄
 * @return PCM 帧数，失败返回 -1
 */
API_EXPORT long long audio_get_position(int handle)
{
    if (handle < 0 || handle >= g_sound_count) return -1;

    ma_uint64 frame;
    if (ma_sound_get_cursor_in_pcm_frames(&g_sounds[handle], &frame) != MA_SUCCESS)
        return -1;
    return (long long)frame;
}

/**
 * @brief 获取音源总长度（PCM 帧数）
 * @param handle 音源句柄
 * @return PCM 帧数，失败返回 -1
 */
API_EXPORT long long audio_get_length(int handle)
{
    if (handle < 0 || handle >= g_sound_count) return -1;

    ma_uint64 length;
    if (ma_sound_get_length_in_pcm_frames(&g_sounds[handle], &length) != MA_SUCCESS)
        return -1;
    return (long long)length;
}

/**
 * @brief 获取当前播放位置（毫秒）
 * @param handle 音源句柄
 * @return 毫秒数，失败返回 -1
 */
API_EXPORT long long audio_get_position_in_milliseconds(int handle)
{
    if (handle < 0 || handle >= g_sound_count) return -1;

    ma_uint64 frame;
    if (ma_sound_get_cursor_in_pcm_frames(&g_sounds[handle], &frame) != MA_SUCCESS)
        return -1;

    ma_uint32 sr = ma_engine_get_sample_rate(&g_engine);
    return (long long)(frame * 1000 / sr);
}

/**
 * @brief 获取音源总长度（毫秒）
 * @param handle 音源句柄
 * @return 毫秒数，失败返回 -1
 */
API_EXPORT long long audio_get_length_in_milliseconds(int handle)
{
    if (handle < 0 || handle >= g_sound_count) return -1;

    ma_uint64 length;
    if (ma_sound_get_length_in_pcm_frames(&g_sounds[handle], &length) != MA_SUCCESS)
        return -1;

    ma_uint32 sr = ma_engine_get_sample_rate(&g_engine);
    return (long long)(length * 1000 / sr);
}

/* ─── 3D 空间音频 ───────────────────────────────────── */

/**
 * @brief 启用/禁用空间音频
 * @param handle  音源句柄
 * @param enabled 1 启用，0 禁用（禁用后 set_pan 生效）
 */
API_EXPORT void audio_set_spatialization_enabled(int handle, int enabled)
{
    if (handle < 0 || handle >= g_sound_count) return;
    ma_sound_set_spatialization_enabled(&g_sounds[handle], enabled ? MA_TRUE : MA_FALSE);
}

/**
 * @brief 设置 3D 空间位置
 * @param handle 音源句柄
 * @param x 世界坐标 X
 * @param y 世界坐标 Y
 * @param z 世界坐标 Z
 */
API_EXPORT void audio_set_position(int handle, float x, float y, float z)
{
    if (handle < 0 || handle >= g_sound_count) return;
    ma_sound_set_position(&g_sounds[handle], x, y, z);
}

/**
 * @brief 设置衰减模型
 * @param handle 音源句柄
 * @param model  衰减模型 (0=none, 1=inverse, 2=linear, 3=exponential)
 */
API_EXPORT void audio_set_attenuation_model(int handle, int model)
{
    if (handle < 0 || handle >= g_sound_count) return;
    ma_sound_set_attenuation_model(&g_sounds[handle], (ma_attenuation_model)model);
}

/**
 * @brief 设置定位模式
 * @param handle     音源句柄
 * @param positioning 0=absolute, 1=relative
 */
API_EXPORT void audio_set_positioning(int handle, int positioning)
{
    if (handle < 0 || handle >= g_sound_count) return;
    ma_sound_set_positioning(&g_sounds[handle], (ma_positioning)positioning);
}

/**
 * @brief 设置衰减率（rolloff）
 * @param handle  音源句柄
 * @param rolloff 衰减率 (默认 1.0)
 */
API_EXPORT void audio_set_rolloff(int handle, float rolloff)
{
    if (handle < 0 || handle >= g_sound_count) return;
    ma_sound_set_rolloff(&g_sounds[handle], rolloff);
}

/**
 * @brief 设置多普勒因子
 * @param handle 音源句柄
 * @param factor 多普勒因子 (0.0 禁用，默认 1.0)
 */
API_EXPORT void audio_set_doppler_factor(int handle, float factor)
{
    if (handle < 0 || handle >= g_sound_count) return;
    ma_sound_set_doppler_factor(&g_sounds[handle], factor);
}

/**
 * @brief 设置最小增益（空间音频）
 * @param handle  音源句柄
 * @param minGain 最小增益
 */
API_EXPORT void audio_set_min_gain(int handle, float minGain)
{
    if (handle < 0 || handle >= g_sound_count) return;
    ma_sound_set_min_gain(&g_sounds[handle], minGain);
}

/**
 * @brief 设置最大增益（空间音频）
 * @param handle  音源句柄
 * @param maxGain 最大增益
 */
API_EXPORT void audio_set_max_gain(int handle, float maxGain)
{
    if (handle < 0 || handle >= g_sound_count) return;
    ma_sound_set_max_gain(&g_sounds[handle], maxGain);
}

/**
 * @brief 设置最小距离（空间音频）
 * @param handle      音源句柄
 * @param minDistance 最小距离
 */
API_EXPORT void audio_set_min_distance(int handle, float minDistance)
{
    if (handle < 0 || handle >= g_sound_count) return;
    ma_sound_set_min_distance(&g_sounds[handle], minDistance);
}

/**
 * @brief 设置最大距离（空间音频）
 * @param handle      音源句柄
 * @param maxDistance 最大距离
 */
API_EXPORT void audio_set_max_distance(int handle, float maxDistance)
{
    if (handle < 0 || handle >= g_sound_count) return;
    ma_sound_set_max_distance(&g_sounds[handle], maxDistance);
}

/**
 * @brief 设置听锥（Cone）
 * @param handle              音源句柄
 * @param innerAngleRadians   内锥角（弧度）
 * @param outerAngleRadians   外锥角（弧度）
 * @param outerGain           锥外增益
 */
API_EXPORT void audio_set_cone(int handle, float innerAngleRadians, float outerAngleRadians, float outerGain)
{
    if (handle < 0 || handle >= g_sound_count) return;
    ma_sound_set_cone(&g_sounds[handle], innerAngleRadians, outerAngleRadians, outerGain);
}

/* ─── 听筒（Listener）─ 3D 音频的耳朵 ───────────────── */

/**
 * @brief 设置听筒世界坐标位置
 * @param listenerIndex 听筒索引 (0~3)
 * @param x X 坐标
 * @param y Y 坐标
 * @param z Z 坐标
 */
API_EXPORT void audio_set_listener_position(int listenerIndex, float x, float y, float z)
{
    if (!g_initialized) return;
    ma_engine_listener_set_position(&g_engine, (ma_uint32)listenerIndex, x, y, z);
}

/**
 * @brief 设置听筒朝向
 * @param listenerIndex 听筒索引 (0~3)
 * @param forwardX      前方向量 X
 * @param forwardY      前方向量 Y
 * @param forwardZ      前方向量 Z
 */
API_EXPORT void audio_set_listener_direction(int listenerIndex, float forwardX, float forwardY, float forwardZ)
{
    if (!g_initialized) return;
    ma_engine_listener_set_direction(&g_engine, (ma_uint32)listenerIndex, forwardX, forwardY, forwardZ);
}

/**
 * @brief 设置听筒世界朝上向量
 * @param listenerIndex 听筒索引 (0~3)
 * @param x 朝上向量 X
 * @param y 朝上向量 Y
 * @param z 朝上向量 Z
 */
API_EXPORT void audio_set_listener_world_up(int listenerIndex, float x, float y, float z)
{
    if (!g_initialized) return;
    ma_engine_listener_set_world_up(&g_engine, (ma_uint32)listenerIndex, x, y, z);
}

/**
 * @brief 设置听筒听锥
 * @param listenerIndex      听筒索引 (0~3)
 * @param innerAngleRadians  内锥角（弧度）
 * @param outerAngleRadians  外锥角（弧度）
 * @param outerGain          锥外增益
 */
API_EXPORT void audio_set_listener_cone(int listenerIndex, float innerAngleRadians, float outerAngleRadians, float outerGain)
{
    if (!g_initialized) return;
    ma_engine_listener_set_cone(&g_engine, (ma_uint32)listenerIndex, innerAngleRadians, outerAngleRadians, outerGain);
}

/* ─── 一次性音效（Fire-and-Forget）────────────────────── */

/**
 * @brief 播放一次性音效（自动清理，无需管理句柄）
 * @param path   音频文件路径
 * @param volume 音量 (1.0 = 原声)
 * @return 音源句柄（仅用于实时调参），失败返回 -1
 */
API_EXPORT int audio_play_one_shot(const char* path, float volume)
{
    if (!g_initialized) return -1;

    cleanup_one_shots();

    int idx = find_one_shot_slot();
    if (idx < 0) return -1;

    if (ma_sound_init_from_file(&g_engine, path, 0, NULL, NULL, &g_one_shots[idx]) != MA_SUCCESS)
        return -1;

    ma_sound_set_volume(&g_one_shots[idx], volume);
    ma_sound_start(&g_one_shots[idx]);
    return idx;
}
