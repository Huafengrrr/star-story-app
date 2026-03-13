<template>
    <view class="radar-container">
        <view class="radar-header">
            <text class="title">📡 店长专属星空雷达</text>
            <text class="subtitle">嘘... 只有小华子能看的数据密室</text>
        </view>

        <scroll-view class="stats-list" :scroll-y="true">
            <block v-if="stats.length > 0">
                <view class="stat-card" v-for="(item, index) in stats" :key="index">
                    <view class="stat-left">
                        <text class="s-title">📖 {{ item.storyTitle }}</text>
                    </view>

                    <view class="stat-right">
                        <text class="s-count">{{ item.playCount }}</text>
                        <text class="s-label">次播放</text>
                    </view>
                </view>
            </block>
            <block v-else>
                <text class="empty-text">雷达尚未捕获到信号...</text>
            </block>
        </scroll-view>
    </view>
</template>

<script>
const db = uniCloud.database();
const _ = db.command;

export default {
    data() {
        return {
            stats: []
        };
    },
    onShow() {
        this.fetchRadarData();
    },
    methods: {
        async fetchRadarData() {
            uni.showLoading({
                title: '雷达扫描中...'
            });
            try {
                // 前端直接拉取数据最大限制为 500 条
                const res = await db.collection('play_records').limit(500).get();

                // 🔴 核心修复：完美适配 uniCloud 获取数据结构 res.result.data
                const resData = (res.result && res.result.data) ? res.result.data : (res.data || []);

                // 算法：把零散的播放记录，按故事名字进行分组统计
                const countMap = {};
                resData.forEach((record) => {
                    const title = record.storyTitle || '未知故事';
                    if (countMap[title]) {
                        countMap[title]++;
                    } else {
                        countMap[title] = 1;
                    }
                });

                // 把字典转成数组，并按照播放次数从高到低排序（看她最爱哪一个）
                const statsArray = Object.keys(countMap)
                    .map((title) => {
                        return {
                            storyTitle: title,
                            playCount: countMap[title]
                        };
                    })
                    .sort((a, b) => b.playCount - a.playCount);
                    
                // Vue 的直接赋值
                this.stats = statsArray;
                
                uni.hideLoading();
            } catch (err) {
                uni.hideLoading();
                console.error('雷达扫描失败', err);
                uni.showToast({
                    title: '雷达扫描失败',
                    icon: 'none'
                });
            }
        }
    }
};
</script>

<style>
@import './secretRadar.css';
</style>