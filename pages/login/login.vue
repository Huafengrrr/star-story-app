<template>
    <view class="login-container">
        <view class="night-sky">
            <view class="stars stars-slow"></view>
            <view class="stars stars-fast"></view>
        </view>

        <view class="glass-panel">
            <text class="title">🌌 星空通行证</text>
            
            <block v-if="hasLogin">
                <text class="subtitle">欢迎回来，星空的守护者</text>
                <view class="welcome-box">
                    <text class="welcome-emoji">🛸</text>
                    <text class="welcome-text">已连接身份: {{ savedAccount }}</text>
                </view>
                <button class="action-btn enter-btn" @tap="goHome">🚀 直接进入星空</button>
                <button class="action-btn switch-btn" @tap="switchAccount">切换其他账号</button>
            </block>

            <block v-else>
                <text class="subtitle">连接宇宙，定制你的专属档案</text>

                <view class="input-group">
                    <input 
                        class="glass-input" 
                        placeholder="请输入账号" 
                        placeholder-style="color: rgba(255,255,255,0.4);" 
                        :value="account" 
                        @input="onAccInput" 
                    />
                </view>
                
                <view class="input-group">
                    <input 
                        class="glass-input" 
                        :password="true" 
                        placeholder="请输入密码" 
                        placeholder-style="color: rgba(255,255,255,0.4);" 
                        :value="password" 
                        @input="onPwdInput" 
                    />
                </view>

                <view class="btn-row">
                    <button class="action-btn login-btn" @tap="doLogin">登录</button>
                    <button class="action-btn reg-btn" @tap="doRegister">注册专属ID</button>
                </view>
            </block>
        </view>
    </view>
</template>

<script>
const db = uniCloud.database();

export default {
    data() {
        return {
            hasLogin: false,
            savedAccount: '',
            account: '',
            password: ''
        };
    },
    onShow() {
        const currentUser = uni.getStorageSync('currentUser');
        if (currentUser && currentUser._id) {
            this.hasLogin = true;
            this.savedAccount = currentUser.account;
        } else {
            this.hasLogin = false;
        }
    },
    methods: {
        onAccInput(e) { this.account = e.detail.value.trim(); },
        onPwdInput(e) { this.password = e.detail.value.trim(); },

        goHome() {
            uni.reLaunch({ url: '/pages/storyList/storyList' });
        },

        switchAccount() {
            this.hasLogin = false;
            this.account = '';
            this.password = '';
        },

        // 🌟 新增：强制索要 CID 的魔法函数（等待手机系统回应）
        getPhoneCID() {
            return new Promise((resolve) => {
                uni.getPushClientId({
                    success: (res) => {
                        console.log('成功强行索要到 CID:', res.cid);
                        resolve(res.cid);
                    },
                    fail: (err) => {
                        console.error('获取 CID 失败:', err);
                        resolve(''); // 就算失败了也不能卡死，返回空字符串
                    }
                });
            });
        },

        // ==========================================
        // 📝 注册专属 ID 逻辑
        // ==========================================
        async doRegister() {
            if (!this.account || !this.password) {
                return uni.showToast({ title: '账号和密码不能为空喔', icon: 'none' });
            }

            uni.showLoading({ title: '正在连接宇宙信号...' });

            try {
                // 1. 检查账号是否被抢注
                const checkRes = await db.collection('star_users').where({ account: this.account }).get();
                if (checkRes.result.data.length > 0) {
                    uni.hideLoading();
                    return uni.showToast({ title: '这个账号已经被别人用啦', icon: 'none' });
                }

                // 🌟 2. 关键：当场强行获取 CID，拿不到不罢休！
                const myCid = await this.getPhoneCID();
                
                // 如果实在拿不到，给个弹窗提示（方便咱们排查问题）
                if (!myCid) {
                    uni.showToast({ title: '警告：未能获取手机标识', icon: 'none', duration: 3000 });
                }

                // 3. 写入数据库
                const addRes = await db.collection('star_users').add({
                    account: this.account,
                    password: this.password,
                    createTime: Date.now(),
                    pushClientId: myCid  // 把当场拿到的 CID 传上去！
                });

                uni.setStorageSync('currentUser', {
                    _id: addRes.result.id,
                    account: this.account
                });

                uni.hideLoading();
                uni.showToast({ title: '注册成功！', icon: 'success' });
                setTimeout(() => { this.goHome(); }, 1000);

            } catch (err) {
                uni.hideLoading();
                uni.showToast({ title: '网络出小差啦', icon: 'none' });
            }
        },

        // ==========================================
        // 🔑 登录逻辑
        // ==========================================
        async doLogin() {
            if (!this.account || !this.password) {
                return uni.showToast({ title: '账号和密码不能为空喔', icon: 'none' });
            }

            uni.showLoading({ title: '验证星空密码中...' });

            try {
                const loginRes = await db.collection('star_users').where({
                    account: this.account,
                    password: this.password
                }).get();

                if (loginRes.result.data.length > 0) {
                    const userRecord = loginRes.result.data[0];
                    
                    // 🌟 关键：当场强行获取 CID
                    const myCid = await this.getPhoneCID();
                    
                    if (myCid) {
                        // 更新到数据库
                        await db.collection('star_users').doc(userRecord._id).update({
                            pushClientId: myCid
                        }).catch(err => { console.log('CID更新失败', err) });
                    } else {
                        uni.showToast({ title: '警告：未能获取手机标识', icon: 'none', duration: 3000 });
                    }
                    
                    uni.setStorageSync('currentUser', {
                        _id: userRecord._id,
                        account: userRecord.account
                    });

                    uni.hideLoading();
                    uni.showToast({ title: '欢迎回来', icon: 'success' });
                    setTimeout(() => { this.goHome(); }, 1000);
                } else {
                    uni.hideLoading();
                    return uni.showToast({ title: '账号或密码不对喔', icon: 'error' });
                }
            } catch (err) {
                uni.hideLoading();
                uni.showToast({ title: '网络出小差啦', icon: 'none' });
            }
        }
    }
};
</script>

<style>
/* 保持绝美的样式完全不变 */
page { height: 100%; background-color: #040710; }
.login-container { width: 100vw; height: 100vh; display: flex; justify-content: center; align-items: center; position: relative; }
.night-sky { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; background: radial-gradient(circle at center, #0a1128 0%, #000000 100%); }
.stars { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
.stars-slow { background-image: repeating-radial-gradient(white, rgba(255,255,255,0.2) 1rpx, transparent 2rpx, transparent 100rpx); background-size: 500rpx 500rpx; opacity: 0.3; animation: starsMove 200s linear infinite; }
.stars-fast { background-image: repeating-radial-gradient(white, rgba(255,255,255,0.3) 2rpx, transparent 3rpx, transparent 150rpx); background-size: 400rpx 400rpx; opacity: 0.6; animation: starsMove 120s linear infinite; }
@keyframes starsMove { from { background-position: 0 0; } to { background-position: 1000rpx 1000rpx; } }

.glass-panel { width: 85%; background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(15px); border: 2rpx solid rgba(255, 255, 255, 0.1); border-radius: 40rpx; padding: 60rpx 40rpx; display: flex; flex-direction: column; align-items: center; box-shadow: 0 20rpx 50rpx rgba(0,0,0,0.5); box-sizing: border-box; }
.title { font-size: 44rpx; font-weight: bold; color: #fff; text-shadow: 0 0 15rpx rgba(255,176,32,0.6); margin-bottom: 10rpx; }
.subtitle { font-size: 24rpx; color: rgba(255,255,255,0.6); margin-bottom: 50rpx; }

.welcome-box { display: flex; flex-direction: column; align-items: center; background: rgba(0,0,0,0.2); padding: 40rpx; border-radius: 30rpx; margin-bottom: 40rpx; border: 2rpx dashed rgba(255,255,255,0.2); width: 100%; box-sizing: border-box; }
.welcome-emoji { font-size: 100rpx; margin-bottom: 20rpx; }
.welcome-text { color: #FFDAB9; font-size: 30rpx; font-weight: bold; }

.input-group { width: 100%; margin-bottom: 35rpx; }
.glass-input { width: 100%; height: 80rpx; background: rgba(0,0,0,0.3); border-radius: 20rpx; padding: 0 30rpx; color: #fff; font-size: 28rpx; border: 2rpx solid rgba(255,255,255,0.1); box-sizing: border-box;}

.btn-row { width: 100%; display: flex; justify-content: space-between; margin-top: 10rpx; }
.action-btn { height: 80rpx; border-radius: 40rpx; color: #fff; font-size: 30rpx; font-weight: bold; display: flex; justify-content: center; align-items: center; border: none; }
.action-btn:active { transform: scale(0.95); }

.login-btn { width: 46%; background: rgba(255, 255, 255, 0.1); border: 2rpx solid rgba(255, 255, 255, 0.3); }
.reg-btn { width: 46%; background: linear-gradient(135deg, #FFB020 0%, #FF6B6B 100%); box-shadow: 0 10rpx 20rpx rgba(255, 107, 107, 0.3); }

.enter-btn { width: 100%; background: linear-gradient(135deg, #FFB020 0%, #FF6B6B 100%); margin-bottom: 20rpx; box-shadow: 0 10rpx 20rpx rgba(255, 107, 107, 0.3); }
.switch-btn { width: 100%; background: transparent; border: 2rpx solid rgba(255,255,255,0.2); color: rgba(255,255,255,0.6); }
</style>