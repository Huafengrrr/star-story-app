<template>
    <view class="main-container">
        <view class="night-sky">
            <view class="stars stars-slow"></view>
            <view class="stars stars-fast"></view>

            <view class="meteors">
                <view class="meteor m1"></view>
                <view class="meteor m2"></view>
                <view class="meteor m3"></view>
                <view class="meteor m4"></view>
                <view class="meteor m5"></view>
                <view class="meteor m6"></view>
            </view>
        </view>

        <view class="content-overlay">
            <view class="header">
                <text class="app-title">小华子的故事屋</text>
                <text :class="'app-slogan ' + (isFadingIn ? 'fade-in-text' : '')">{{ currentQuote }}</text>
            </view>

            <button class="enter-btn" @tap="goToList">我要听故事啦</button>
        </view>
    </view>
</template>

<script>
// 1. 在文件最顶部（export default 外面）初始化数据库对象
const db = uniCloud.database();	
	
export default {
    data() {
        return {
            currentQuote: '',
            isFadingIn: false
        };
    },
    onLoad() {
        this.db = uniCloud.database();
        this.bgm = uni.createInnerAudioContext();
        // 🔴 核心修复 1：强制开启自动播放
        this.bgm.autoplay = true;
        this.bgm.loop = true;

        // 🔴 核心修复 2：去掉 0，一开始就直接把音量给到目标值 0.3
        this.bgm.volume = 0.3;
        this.bgm.src = 'https://mp-6aceaf7c-21e7-4eb1-a4f8-8e2bbdb8d479.cdn.bspapp.com/BGM/スパークル (movie ver.)-RADWIMPS.mp3';
        this.isFadingOut = false;
        this.bgm.onError((err) => console.error('BGM出错:', err));
    },
    onShow() {
        this.isFadingOut = false;
        this.generateRandomQuote();

        // 🔴 核心修复 3：去掉进场时的定时器渐显逻辑，直接简单粗暴地播放
        if (this.bgm) {
            if (this.fadeInterval) {
                clearInterval(this.fadeInterval);
            }
            // 确保如果是从故事页退回来的，音量能恢复到 0.3
            this.bgm.volume = 0.3;
            if (this.bgm.paused) {
                this.bgm.play();
            }
        }
    },
    onHide() {

        if (this.bgm && !this.isFadingOut) {
            this.bgm.pause();
        }
    },
    onUnload() {
        if (this.bgm) {
            this.bgm.destroy();
        }
        if (this.fadeInterval) {
            clearInterval(this.fadeInterval);
        }
    },
   methods: {
           // 抽取随机名言的核心逻辑
           generateRandomQuote() {
               this.isFadingIn = false;
               
               // 2. 使用 aggregate().sample() 进行随机抽样，抽取 1 条
               db.collection('quotes')
                   .aggregate()
                   .sample({
                       size: 1
                   })
                   .end()
                   .then((res) => {
                       // ⚠️ 注意这里的区别：uniCloud 聚合查询的数据藏在 res.result.data 里
                       if (res.result && res.result.data && res.result.data.length > 0) {
                           setTimeout(() => {
                               // 3. 将云端抽到的名言赋值给页面的变量
                               this.currentQuote = res.result.data[0].text;
                               this.isFadingIn = true;
                           }, 50);
                       } else {
                           // 如果数据库里一条数据都没有，就用保底名言
                           this.fallbackQuote();
                       }
                   })
                   .catch((err) => {
                       console.error('抽取云端名言失败:', err);
                       this.fallbackQuote();
                   });
           },
   
           fallbackQuote() {
               setTimeout(() => {
                   this.currentQuote = '探索星空的奥秘，聆听梦幻的耳语。';
                   this.isFadingIn = true;
               }, 50);
           },

        // 🔴 离场跳转时，保留绝美的 2 秒渐隐效果
        goToList() {
            if (this.isFadingOut) {
                return;
            }
            this.isFadingOut = true;
            if (!this.bgm) {
                uni.navigateTo({
                    url: '/pages/storyList/storyList'
                });
                return;
            }
            if (this.fadeInterval) {
                clearInterval(this.fadeInterval);
            }
            const duration = 2000;
            const intervalTime = 50;
            const steps = duration / intervalTime;
            const volumeStep = this.bgm.volume / steps;
            this.fadeInterval = setInterval(() => {
                let currentVol = this.bgm.volume - volumeStep;
                if (currentVol <= 0.01) {
                    this.bgm.volume = 0;
                    this.bgm.pause();
                    clearInterval(this.fadeInterval);
                    uni.navigateTo({
                        url: '/pages/storyList/storyList'
                    });
                } else {
                    this.bgm.volume = currentVol;
                }
            }, intervalTime);
        }
    }
};
</script>
<style>
@import './index.css';
</style>
