import { AudioContext } from "@brass/audio";

const ctx = new AudioContext();
await ctx.init(); 
const sound = ctx.createSound('examples/audio/test.mp3');
sound.play();
sound.speed = 1.1;
sound.volume = 0.5;

sound.addEventListener('ended', ()=> {
    console.log("播放完毕");
    Deno.exit(0);
}); 

sound.addEventListener('pause', ()=> {
    console.log("暂停播放");
});

sound.addEventListener('resume', ()=> {
    console.log("继续播放");
});

setTimeout(()=> {
    sound.pause();
    console.log('已暂停'); 
}, 3000);

setTimeout(()=> {
    sound.resume();
    console.log('已恢复'); 
}, 3000 + 3000);

console.log("正在播放...");