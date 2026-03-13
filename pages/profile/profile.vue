<template>
    <view class="profile-container">
        <view class="night-sky">
            <view class="stars stars-slow"></view>
            <view class="stars stars-fast"></view>
        </view>

        <view class="glass-panel">
            <text class="title">🌌 星空档案室</text>
            <text class="subtitle">定制你在宇宙中的专属形象</text>

            <view class="current-avatar-box">
                <text class="current-emoji">{{ avatarUrl || '👽' }}</text>
            </view>
            
            <view class="id-badge" v-if="exclusiveId">
                <text class="id-label">NO.</text>
                <text class="id-value">{{ exclusiveId }}</text>
            </view>

            <text class="tip-text">请从下方选择你的星空化身</text>

            <scroll-view class="avatar-scroll" scroll-x="true" :show-scrollbar="false">
                <view class="avatar-grid">
                    <view
                        v-for="(emoji, index) in presetAvatars"
                        :key="index"
                        :class="['avatar-option', avatarUrl === emoji ? 'active' : '']"
                        @tap="selectAvatar(emoji)"
                    >
                        <text class="emoji-text">{{ emoji }}</text>
                    </view>
                </view>
            </scroll-view>

            <view class="input-group">
                <text class="label">星空代号</text>
                <input
                    type="text"
                    class="glass-input"
                    placeholder="请输入你的专属代号"
                    placeholder-style="color: rgba(255,255,255,0.3);"
                    @input="onInputNickname"
                    :value="nickname"
                />
            </view>

            <view class="btn-group">
                <button class="save-btn" @tap="saveProfile">保存星空档案</button>
                                
                <button class="bind-btn" @tap="goToFriends">🔗 添加/查看星空羁绊</button>
                
                 <button class="logout-btn" @tap="logout">退出当前账号</button>
            </view>
        </view>
    </view>
</template>

<script>
const db = uniCloud.database();

export default {
    data() {
        return {
            avatarUrl: '👽', // 默认化身
            nickname: '',
            exclusiveId: '', // 🔴 新增：用于存放专属ID
            presetAvatars: [
                '👽', '👩‍🚀', '👨‍🚀', '🤖', '👻', 
                '🐶', '🐱', '🐰', '🦊', '🐻', 
                '🐼', '🦁', '🚀', '🛸', '⭐', '🌙', '☄️'
            ]
        };
    },
    onLoad() {
        // 1. 获取之前的头像和昵称档案
        const profile = uni.getStorageSync('userProfile');
        if (profile) {
            this.avatarUrl = profile.avatarUrl || '👽';
            this.nickname = profile.nickname || '';
        }

        // 🔴 2. 获取登录时保存的通行证（提取专属ID）
        const currentUser = uni.getStorageSync('currentUser');
        if (currentUser && currentUser._id) {
            this.exclusiveId = currentUser._id;
        }
    },
    methods: {
		
		goToFriends() {
		            uni.navigateTo({
		                url: '/pages/friends/friends'
		            });
		        },
		
        selectAvatar(emoji) {
            this.avatarUrl = emoji;
        },

        onInputNickname(e) {
            this.nickname = e.detail.value.trim();
        },

        async saveProfile() {
            const { avatarUrl, nickname } = this;

            if (!avatarUrl || !nickname) {
                return uni.showToast({
                    title: '请完善化身和星空代号',
                    icon: 'none'
                });
            }

            uni.showLoading({ title: '同步宇宙档案...' });

            try {
                // 1. 存入手机本地
                uni.setStorageSync('userProfile', {
                    avatarUrl: avatarUrl,
                    nickname: nickname
                });

                // 2. 云端同步
                let docId = uni.getStorageSync('profileDocId');

                if (docId) {
                    await db.collection('star_profiles').doc(docId).update({
                        avatarUrl: avatarUrl,
                        nickname: nickname,
                        updateTime: Date.now()
                    });
                } else {
                    const res = await db.collection('star_profiles').add({
                        avatarUrl: avatarUrl,
                        nickname: nickname,
                        createTime: Date.now()
                    });
                    uni.setStorageSync('profileDocId', res.result.id);
                }

                uni.hideLoading();
                uni.showToast({ title: '档案建立成功', icon: 'success' });

                setTimeout(() => {
                    uni.navigateBack();
                }, 1500);
            } catch (err) {
                uni.hideLoading();
                console.error('保存失败:', err);
                uni.showToast({ title: '保存失败', icon: 'error' });
            }
        },

        logout() {
            uni.showModal({
                title: '离开星空',
                content: '确定要退出当前账号吗？',
                confirmColor: '#FF6B6B',
                success: (res) => {
                    if (res.confirm) {
                        // 1. 撕毁本地通行证缓存
                        uni.removeStorageSync('currentUser');
                        
                        // 2. 清空档案缓存
                        uni.removeStorageSync('userProfile');
                        uni.removeStorageSync('profileDocId');
                        
                        // 3. 打回登录页面
                        uni.reLaunch({
                            url: '/pages/login/login' 
                        });
                    }
                }
            });
        }
    }
};
</script>

<style>
/* 引入基础样式 */
@import './profile.css';

page { height: 100%; background-color: #040710; }
.profile-container { width: 100vw; height: 100vh; display: flex; justify-content: center; align-items: center; position: relative; }

/* 星空背景 */
.night-sky { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; background: radial-gradient(circle at center, #0a1128 0%, #000000 100%); }
.stars { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
.stars-slow { background-image: repeating-radial-gradient(white, rgba(255,255,255,0.2) 1rpx, transparent 2rpx, transparent 100rpx); background-size: 500rpx 500rpx; opacity: 0.3; animation: starsMove 200s linear infinite; }
.stars-fast { background-image: repeating-radial-gradient(white, rgba(255,255,255,0.3) 2rpx, transparent 3rpx, transparent 150rpx); background-size: 400rpx 400rpx; opacity: 0.6; animation: starsMove 120s linear infinite; }
@keyframes starsMove { from { background-position: 0 0; } to { background-position: 1000rpx 1000rpx; } }

/* 玻璃面板 */
.glass-panel { width: 85%; background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(15px); border: 2rpx solid rgba(255, 255, 255, 0.1); border-radius: 40rpx; padding: 50rpx 40rpx; display: flex; flex-direction: column; align-items: center; box-shadow: 0 20rpx 50rpx rgba(0,0,0,0.5); box-sizing: border-box; }
.title { font-size: 44rpx; font-weight: bold; color: #fff; text-shadow: 0 0 15rpx rgba(255,176,32,0.6); margin-bottom: 10rpx; }
.subtitle { font-size: 24rpx; color: rgba(255,255,255,0.6); margin-bottom: 30rpx; }

/* 当前头像展示 */
.current-avatar-box { width: 160rpx; height: 160rpx; margin: 0 auto 15rpx; background: rgba(255, 255, 255, 0.1); border: 4rpx solid rgba(255, 255, 255, 0.3); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 30rpx rgba(255, 255, 255, 0.1); }
.current-emoji { font-size: 80rpx; }

/* 🌟 新增：专属 ID 身份牌样式 */
.id-badge {
    background: rgba(255, 255, 255, 0.1);
    padding: 6rpx 24rpx;
    border-radius: 30rpx;
    margin-bottom: 30rpx;
    display: flex;
    align-items: center;
    border: 2rpx solid rgba(255, 176, 32, 0.3);
    box-shadow: 0 4rpx 10rpx rgba(0,0,0,0.2);
}
.id-label {
    font-size: 20rpx;
    color: #FFB020;
    margin-right: 10rpx;
    font-weight: bold;
}
.id-value {
    font-size: 22rpx;
    color: #fff;
    font-family: monospace; /* 等宽字体，数字看起来更规整科幻 */
    letter-spacing: 2rpx;
    opacity: 0.9;
}

.tip-text { font-size: 22rpx; color: rgba(255,255,255,0.4); margin-bottom: 30rpx; }

/* 滚动头像列表 */
.avatar-scroll { width: 100%; margin-bottom: 40rpx; }
.avatar-grid { display: flex; flex-direction: row; padding: 10rpx 0; width: max-content; }
.avatar-option { width: 100rpx; height: 100rpx; margin: 0 10rpx; background: rgba(255, 255, 255, 0.05); border: 2rpx solid transparent; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease; }
.avatar-option.active { background: rgba(255, 255, 255, 0.2); border-color: #FFB020; transform: scale(1.1); }
.emoji-text { font-size: 50rpx; }

/* 输入框区域 */
.input-group { width: 100%; margin-bottom: 50rpx; display: flex; flex-direction: column; }
.label { font-size: 26rpx; color: #FFDAB9; margin-bottom: 15rpx; font-weight: bold; }
.glass-input { width: 100%; height: 80rpx; background: rgba(0,0,0,0.3); border-radius: 20rpx; padding: 0 30rpx; color: #fff; font-size: 28rpx; border: 2rpx solid rgba(255,255,255,0.1); box-sizing: border-box;}

/* 按钮组 */
.btn-group { width: 100%; display: flex; flex-direction: column; gap: 20rpx; }
.save-btn { width: 100%; height: 80rpx; background: linear-gradient(135deg, #FFB020 0%, #FF6B6B 100%); border-radius: 40rpx; color: #fff; font-size: 30rpx; font-weight: bold; display: flex; justify-content: center; align-items: center; box-shadow: 0 10rpx 20rpx rgba(255, 107, 107, 0.3); border: none; }
.save-btn:active { transform: scale(0.95); }
.logout-btn { width: 100%; height: 80rpx; background: rgba(255, 255, 255, 0.05); border-radius: 40rpx; color: #FF6B6B; font-size: 28rpx; display: flex; justify-content: center; align-items: center; border: 2rpx solid rgba(255, 107, 107, 0.3); }
.logout-btn:active { background: rgba(255, 107, 107, 0.1); transform: scale(0.95); }

.bind-btn { width: 100%; height: 80rpx; background: rgba(255, 255, 255, 0.05); border-radius: 40rpx; color: #FFB020; font-size: 28rpx; display: flex; justify-content: center; align-items: center; border: 2rpx solid rgba(255, 176, 32, 0.5); font-weight: bold; }
.bind-btn:active { background: rgba(255, 176, 32, 0.1); transform: scale(0.95); }
</style>