<template>
    <view class="detail-container">
        <view class="background-layer">
            <view class="star-flow-group">
                <view class="star-field layer1"></view>
                <view class="star-field layer2"></view>
                <view class="star-field layer3"></view>
            </view>

            <view class="meteors">
                <view class="meteor m1"></view>
                <view class="meteor m2"></view>
                <view class="meteor m3"></view>
            </view>
        </view>

        <view class="glass-content">
            <image class="big-cover" :src="storyInfo.cover" mode="aspectFill"></image>
            <text class="title">{{ storyInfo.title }}</text>

           <view class="lyric-glass-box">
                           <scroll-view class="lyric-scroll" scroll-y="true" scroll-with-animation :scroll-into-view="'lyric-' + targetLyricIndex">
                               <view class="lyric-list">
                                   <view class="padding-block"></view>
                                   
                                   <block v-for="(item, index) in lyrics" :key="index">
                                       <view :id="'lyric-' + index" :class="['lyric-item-wrap', index === currentLyricIndex ? 'active' : '']">
                                           <text class="lyric-text">{{ item.text }}</text>
                                       </view>
                                   </block>
                                   
                                   <view class="padding-block"></view>
                               </view>
                           </scroll-view>
                       </view>

            <view class="control-area glass-box">
                <slider
                    class="progress-bar"
                    @change="sliderChange"
                    @changing="sliderChanging"
                    :value="progress"
                    min="0"
                    max="100"
                    activeColor="#FFB020"
                    backgroundColor="rgba(255,255,255,0.2)"
                    block-size="12"
                />

                <view class="time-box">
                    <text>{{ currentTimeStr }}</text>
                    <text>{{ durationStr }}</text>
                </view>

                <view class="btn-group">
                    <view class="play-btn" @tap="togglePlay">
                        <text>{{ isPlaying ? '暂停' : '播放' }}</text>
                    </view>
                </view>
            </view>
        </view>
    </view>
</template>

<script>
// 保证全局只有这一个数据库声明
const db = uniCloud.database();

export default {
    data() {
        return {
            storyInfo: {
                cover: '',
                title: ''
            },
            isPlaying: false,
            progress: 0,
            currentTimeStr: '00:00',
            durationStr: '00:00',
            isDragging: false,
            hasRecordedPlay: false,
            // 字幕相关
            lyrics: [],
            currentLyricIndex: 0,
            targetLyricIndex: 0 // 专门用来指挥滚动位置的锚点
        };
    },
    onLoad(options) {
        this.windowRatio = uni.getSystemInfoSync().windowWidth / 750;
        const storyId = parseInt(options.id);
        if (storyId) {
            uni.showLoading({
                title: '准备故事中...'
            });
            db.collection('stories')
                .where({
                    id: storyId
                })
                .get()
                .then((res) => {
                    uni.hideLoading();
                    
                    // 🔴 核心修复 1：适配 uniCloud 数据结构
                    const dataList = (res.result && res.result.data) ? res.result.data : (res.data || []);
                    
                    if (dataList.length > 0) {
                        const fetchedStory = dataList[0];
                        if (!fetchedStory.audioUrl) {
                            uni.showToast({
                                title: '音频还未上传',
                                icon: 'none'
                            });
                            return;
                        }
                        
                        // 🔴 核心修复 2：去掉 this.setData，改为直接赋值
                        this.storyInfo = fetchedStory;

                        // 初始化并播放音频
                        this.initAudio(fetchedStory.audioUrl);

                        // 如果数据库里有字幕文件的 URL，就去下载并读取它
                        if (fetchedStory.srtUrl) {
                            this.fetchAndParseSubtitle(fetchedStory.srtUrl);
                        } else if (fetchedStory.srtText) {
                            this.lyrics = this.parseSRT(fetchedStory.srtText);
                        }
                    }
                })
                .catch((err) => {
                    uni.hideLoading();
                    console.error('获取故事详情失败:', err);
                });
        }
    },
    onUnload() {
        if (this.audioCtx) {
            this.audioCtx.destroy();
        }
    },
    methods: {
        // ==========================================
        // 📥 下载并读取云端 SRT 文件
        // ==========================================
        fetchAndParseSubtitle(fileUrl) {
            uni.request({
                url: fileUrl,
                method: 'GET',
                success: (res) => {
                    // 直接赋值
                    this.lyrics = this.parseSRT(res.data);
                },
                fail: (err) => console.error('读取字幕文本失败:', err)
            });
        },

        // SRT 解析算法
        parseSRT(srtText) {
            if (!srtText) {
                return [];
            }
            const normalizedText = srtText.replace(/\r\n/g, '\n');
            const blocks = normalizedText.trim().split(/\n\s*\n/);
            const result = [];
            blocks.forEach((block) => {
                const lines = block.split('\n');
                if (lines.length >= 3) {
                    const timeLine = lines[1];
                    const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{2,3})/);
                    if (timeMatch) {
                        const hours = parseInt(timeMatch[1]);
                        const minutes = parseInt(timeMatch[2]);
                        const seconds = parseInt(timeMatch[3]);
                        const milliseconds = parseInt(timeMatch[4]);
                        const msDivider = timeMatch[4].length === 3 ? 1000 : 100;
                        const time = hours * 3600 + minutes * 60 + seconds + milliseconds / msDivider;
                        const text = lines.slice(2).join('\n').trim();
                        if (text) {
                            result.push({
                                time,
                                text
                            });
                        }
                    }
                }
            });
            return result;
        },

        initAudio(audioUrl) {
            if (this.audioCtx) {
                this.audioCtx.destroy();
            }
            this.audioCtx = uni.createInnerAudioContext();
            this.audioCtx.src = audioUrl;
            this.setupAudioEvents();

            // 准备好后直接自动播放
            this.audioCtx.onCanplay(() => {
                this.audioCtx.play();
                this.isPlaying = true;
            });
        },

        setupAudioEvents() {
            this.audioCtx.onTimeUpdate(() => {
                if (!this.isDragging) {
                    const current = this.audioCtx.currentTime;
                    const total = this.audioCtx.duration;

                    // 1. 更新进度条和时间 (全部改为直接赋值)
                    this.progress = (current / total) * 100;
                    this.currentTimeStr = this.formatTime(current);
                    this.durationStr = this.formatTime(total);

                    // 2. 瀑布流字幕滚动计算
                                        const lyrics = this.lyrics;
                                        if (lyrics.length > 0) {
                                            let activeIndex = this.currentLyricIndex;
                                            for (let i = 0; i < lyrics.length; i++) {
                                                if (current >= lyrics[i].time) {
                                                    activeIndex = i;
                                                } else {
                                                    break;
                                                }
                                            }
                                            if (activeIndex !== this.currentLyricIndex) {
                                                this.currentLyricIndex = activeIndex;
                                                // 🔴 核心修改 2：不再算像素，直接修改锚点索引！
                                                // 为了让字幕居中，可以把锚点稍微往前定几行（比如往前算 2 行）
                                                let target = activeIndex > 2 ? activeIndex - 2 : 0;
                                                this.targetLyricIndex = target;
                                            }
                                        }
                }
            });
            this.audioCtx.onEnded(() => {
                this.isPlaying = false;
                this.progress = 0;
                this.currentLyricIndex = 0;
                this.targetLyricIndex = 0; // 一起归零
            });
        },

        togglePlay() {
            if (!this.audioCtx) {
                return;
            }
            if (this.isPlaying) {
                this.audioCtx.pause();
            } else {
                this.audioCtx.play();
            }
            
            this.isPlaying = !this.isPlaying;

            // 🔴 隐形雷达探头
            if (!this.isPlaying && !this.hasRecordedPlay) {
                this.hasRecordedPlay = true;
                
                const profile = uni.getStorageSync('userProfile');
                const readerName = profile ? profile.nickname : '宝宝';

                // 悄悄往数据库写入一条播放记录
                db.collection('play_records')
                    .add({
                        storyId: this.storyInfo._id, 
                        storyTitle: this.storyInfo.title, 
                        reader: readerName, 
                        playTime: Date.now() // 🔴 核心修复 3：使用 Date.now() 替换 db.serverDate()
                    })
                    .then((res) => {
                        console.log('雷达：成功捕获一次播放记录');
                    })
                    .catch((err) => {
                        console.error('雷达故障：', err);
                    });
            }
        },

        sliderChanging(e) {
            this.isDragging = true;
        },

        sliderChange(e) {
            if (!this.audioCtx) {
                return;
            }
            const value = e.detail.value;
            const targetTime = (value / 100) * this.audioCtx.duration;
            this.audioCtx.seek(targetTime);
            this.isDragging = false;
        },

        formatTime(seconds) {
            if (!seconds) {
                return '00:00';
            }
            const min = Math.floor(seconds / 60);
            const sec = Math.floor(seconds % 60);
            return `${min < 10 ? '0' + min : min}:${sec < 10 ? '0' + sec : sec}`;
        }
    }
};
</script>

<style>
@import './storyDetail.css';


/* 包裹每行歌词的容器，方便控制间距 */
.lyric-item-wrap {
    text-align: center;
    padding: 15rpx 0;
    transition: all 0.3s ease;
}

.lyric-item-wrap.active .lyric-text {
    color: #FFB020;
    font-size: 34rpx;
    font-weight: bold;
    text-shadow: 0 0 10rpx rgba(255, 176, 32, 0.4);
}

.lyric-text {
    font-size: 28rpx;
    color: rgba(255, 255, 255, 0.5);
    transition: all 0.3s ease;
}
</style>