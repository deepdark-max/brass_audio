import LIB_PATH from "./platform.ts";

/**
 * brass-audio FFI bindings
 *
 * All functions return int handles (>=0) for sound references.
 * Handles are valid until `audio_uninit()` or `audio_unload()`.
 *
 * @module
 */

const lib = Deno.dlopen(LIB_PATH, {
  /**
   * 初始化音频引擎
   * @param sampleRate            采样率 (Hz)，如 44100、48000
   * @param channels              输出通道数 (1=单声道, 2=立体声, 6=5.1)
   * @param periodSizeInFrames    每次回调的帧数 (越小延迟越低，建议 256~1024)
   * @returns 0 成功，-1 失败
   */
  audio_init: { parameters: ["i32", "i32", "i32"] as const, result: "i32" },

  /**
   * 销毁引擎，释放所有资源
   */
  audio_uninit: { parameters: [] as const, result: "void" },

  /**
   * 获取引擎输出通道数
   * @returns 通道数（初始化时设定的 channels 值）
   */
  audio_get_channels: { parameters: [] as const, result: "i32" },

  /**
   * 获取引擎采样率
   * @returns 采样率 (Hz)
   */
  audio_get_sample_rate: { parameters: [] as const, result: "i32" },

  /**
   * 获取引擎全局时间（PCM 帧数）
   * @returns 从引擎启动到当前的总 PCM 帧数
   */
  audio_get_engine_time_in_pcm_frames: { parameters: [] as const, result: "i64" },

  /**
   * 获取引擎全局时间（毫秒）
   * @returns 从引擎启动到当前的总毫秒数
   */
  audio_get_engine_time_in_milliseconds: { parameters: [] as const, result: "i64" },

  /**
   * 设置引擎全局时间（PCM 帧数）
   * @param globalTime PCM 帧数
   */
  audio_set_engine_time_in_pcm_frames: { parameters: ["i64"] as const, result: "void" },

  /**
   * 获取全局音量
   * @returns 当前全局音量 (0.0 ~ 1.0)
   */
  audio_get_master_volume: { parameters: [] as const, result: "f32" },

  /**
   * 设置全局音量
   * @param volume 音量 (0.0 ~ 1.0，可大于 1.0 用于增益)
   */
  audio_set_master_volume: { parameters: ["f32"] as const, result: "void" },

  /**
   * 加载音频文件
   * @param path 文件路径（支持 wav/mp3/flac/ogg 等格式）
   * @returns 音源句柄 (>=0)，失败返回 -1
   */
  audio_load: { parameters: ["pointer"] as const, result: "i32" },

  /**
   * 卸载音源
   * @param handle 音源句柄
   */
  audio_unload: { parameters: ["i32"] as const, result: "void" },

  /**
   * 获取音源音频格式信息
   * @param handle          音源句柄
   * @param format[out]     采样格式 (0=unknown, 1=u8, 2=s16, 3=s24, 4=s32, 5=f32)
   * @param channels[out]   通道数
   * @param sampleRate[out] 采样率
   * @returns 0 成功，-1 失败
   */
  audio_get_sound_format: { parameters: ["i32", "pointer", "pointer", "pointer"] as const, result: "i32" },

  /**
   * 播放音源（从当前位置开始）
   * @param handle 音源句柄
   */
  audio_play: { parameters: ["i32"] as const, result: "void" },

  /**
   * 停止音源
   * @param handle 音源句柄
   */
  audio_stop: { parameters: ["i32"] as const, result: "void" },

  /**
   * 查询音源是否正在播放
   * @param handle 音源句柄
   * @returns 1 播放中，0 未播放
   */
  audio_is_playing: { parameters: ["i32"] as const, result: "i32" },

  /**
   * 查询音源是否已到达结尾
   * @param handle 音源句柄
   * @returns 1 已播完，0 未播完
   */
  audio_is_at_end: { parameters: ["i32"] as const, result: "i32" },

  /**
   * 查询音源是否循环
   * @param handle 音源句柄
   * @returns 1 循环，0 不循环
   */
  audio_is_looping: { parameters: ["i32"] as const, result: "i32" },

  /**
   * 设置音量
   * @param handle 音源句柄
   * @param volume 音量 (0.0 = 静音, 1.0 = 原声, 可 >1.0 增益)
   */
  audio_set_volume: { parameters: ["i32", "f32"] as const, result: "void" },

  /**
   * 设置声像
   * @param handle 音源句柄
   * @param pan 声像 (-1.0 全左, 0.0 居中, 1.0 全右)
   */
  audio_set_pan: { parameters: ["i32", "f32"] as const, result: "void" },

  /**
   * 设置音高倍率
   * @param handle 音源句柄
   * @param pitch 音高倍率 (1.0 = 原速, 2.0 = 翻倍速度/音高)
   */
  audio_set_pitch: { parameters: ["i32", "f32"] as const, result: "void" },

  /**
   * 设置是否循环播放
   * @param handle  音源句柄
   * @param looping 1 循环，0 不循环
   */
  audio_set_looping: { parameters: ["i32", "i32"] as const, result: "void" },

  /**
   * 设置淡入淡出（毫秒）
   * @param handle       音源句柄
   * @param volumeBeg    起始音量（-1 表示使用当前音量）
   * @param volumeEnd    结束音量
   * @param fadeLengthMs 淡变时长 (毫秒)
   */
  audio_set_fade_in_milliseconds: { parameters: ["i32", "f32", "f32", "i64"] as const, result: "void" },

  /**
   * 设置在指定引擎全局时间停止播放
   * @param handle     音源句柄
   * @param stopTimeMs 停止时的引擎全局时间 (毫秒)
   */
  audio_set_stop_time_in_milliseconds: { parameters: ["i32", "i64"] as const, result: "void" },

  /**
   * 停止并带淡出
   * @param handle       音源句柄
   * @param fadeLengthMs 淡出时长 (毫秒)
   */
  audio_stop_with_fade_in_milliseconds: { parameters: ["i32", "i64"] as const, result: "void" },

  /**
   * 跳转到指定 PCM 帧
   * @param handle 音源句柄
   * @param frame  目标 PCM 帧位置
   */
  audio_seek: { parameters: ["i32", "i64"] as const, result: "void" },

  /**
   * 设置开始时间（引擎全局时间）
   * @param handle      音源句柄
   * @param startTimeMs 开始播放的引擎全局时间 (毫秒)
   */
  audio_set_start_time_in_milliseconds: { parameters: ["i32", "i64"] as const, result: "void" },

  /**
   * 获取当前播放位置（PCM 帧数）
   * @param handle 音源句柄
   * @returns PCM 帧数，失败返回 -1
   */
  audio_get_position: { parameters: ["i32"] as const, result: "i64" },

  /**
   * 获取音源总长度（PCM 帧数）
   * @param handle 音源句柄
   * @returns PCM 帧数，失败返回 -1
   */
  audio_get_length: { parameters: ["i32"] as const, result: "i64" },

  /**
   * 获取当前播放位置（毫秒）
   * @param handle 音源句柄
   * @returns 毫秒数，失败返回 -1
   */
  audio_get_position_in_milliseconds: { parameters: ["i32"] as const, result: "i64" },

  /**
   * 获取音源总长度（毫秒）
   * @param handle 音源句柄
   * @returns 毫秒数，失败返回 -1
   */
  audio_get_length_in_milliseconds: { parameters: ["i32"] as const, result: "i64" },

  /**
   * 启用/禁用空间音频
   * @param handle  音源句柄
   * @param enabled 1 启用，0 禁用（禁用后 set_pan 生效）
   */
  audio_set_spatialization_enabled: { parameters: ["i32", "i32"] as const, result: "void" },

  /**
   * 设置 3D 空间位置
   * @param handle 音源句柄
   * @param x 世界坐标 X
   * @param y 世界坐标 Y
   * @param z 世界坐标 Z
   */
  audio_set_position: { parameters: ["i32", "f32", "f32", "f32"] as const, result: "void" },

  /**
   * 设置衰减模型
   * @param handle 音源句柄
   * @param model  衰减模型 (0=none, 1=inverse, 2=linear, 3=exponential)
   */
  audio_set_attenuation_model: { parameters: ["i32", "i32"] as const, result: "void" },

  /**
   * 设置定位模式
   * @param handle      音源句柄
   * @param positioning 0=absolute, 1=relative
   */
  audio_set_positioning: { parameters: ["i32", "i32"] as const, result: "void" },

  /**
   * 设置衰减率（rolloff）
   * @param handle  音源句柄
   * @param rolloff 衰减率 (默认 1.0)
   */
  audio_set_rolloff: { parameters: ["i32", "f32"] as const, result: "void" },

  /**
   * 设置多普勒因子
   * @param handle 音源句柄
   * @param factor 多普勒因子 (0.0 禁用，默认 1.0)
   */
  audio_set_doppler_factor: { parameters: ["i32", "f32"] as const, result: "void" },

  /**
   * 设置最小增益（空间音频）
   * @param handle  音源句柄
   * @param minGain 最小增益
   */
  audio_set_min_gain: { parameters: ["i32", "f32"] as const, result: "void" },

  /**
   * 设置最大增益（空间音频）
   * @param handle  音源句柄
   * @param maxGain 最大增益
   */
  audio_set_max_gain: { parameters: ["i32", "f32"] as const, result: "void" },

  /**
   * 设置最小距离（空间音频）
   * @param handle      音源句柄
   * @param minDistance 最小距离
   */
  audio_set_min_distance: { parameters: ["i32", "f32"] as const, result: "void" },

  /**
   * 设置最大距离（空间音频）
   * @param handle      音源句柄
   * @param maxDistance 最大距离
   */
  audio_set_max_distance: { parameters: ["i32", "f32"] as const, result: "void" },

  /**
   * 设置听锥（Cone）
   * @param handle              音源句柄
   * @param innerAngleRadians   内锥角（弧度）
   * @param outerAngleRadians   外锥角（弧度）
   * @param outerGain           锥外增益
   */
  audio_set_cone: { parameters: ["i32", "f32", "f32", "f32"] as const, result: "void" },

  /**
   * 设置听筒世界坐标位置
   * @param listenerIndex 听筒索引 (0~3)
   * @param x X 坐标
   * @param y Y 坐标
   * @param z Z 坐标
   */
  audio_set_listener_position: { parameters: ["i32", "f32", "f32", "f32"] as const, result: "void" },

  /**
   * 设置听筒朝向
   * @param listenerIndex 听筒索引 (0~3)
   * @param forwardX      前方向量 X
   * @param forwardY      前方向量 Y
   * @param forwardZ      前方向量 Z
   */
  audio_set_listener_direction: { parameters: ["i32", "f32", "f32", "f32"] as const, result: "void" },

  /**
   * 设置听筒世界朝上向量
   * @param listenerIndex 听筒索引 (0~3)
   * @param x 朝上向量 X
   * @param y 朝上向量 Y
   * @param z 朝上向量 Z
   */
  audio_set_listener_world_up: { parameters: ["i32", "f32", "f32", "f32"] as const, result: "void" },

  /**
   * 设置听筒听锥
   * @param listenerIndex      听筒索引 (0~3)
   * @param innerAngleRadians  内锥角（弧度）
   * @param outerAngleRadians  外锥角（弧度）
   * @param outerGain          锥外增益
   */
  audio_set_listener_cone: { parameters: ["i32", "f32", "f32", "f32"] as const, result: "void" },

  /**
   * 播放一次性音效（自动清理，无需管理句柄）
   * @param path   音频文件路径
   * @param volume 音量 (1.0 = 原声)
   * @returns 音源句柄（仅用于实时调参），失败返回 -1
   */
  audio_play_one_shot: { parameters: ["pointer", "f32"] as const, result: "i32" },
});

export default lib;
