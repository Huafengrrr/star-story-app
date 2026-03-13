<script>
export default {
    onLaunch: function() {
        console.log('App Launch');
		// 【第一道保险】：监听悄悄溜进来的推送信号
		        uni.onPushMessage((res) => {
		            console.log("拦截到星空信号：", res);
		            
		            // 不管手机系统弹不弹，只要 App 捕捉到信号，我们自己强行弹框！
		            uni.showModal({
		                title: '⚠️ 收到星空专属指令！',
		                content: '宝宝刚刚对你使用了一张特权券，请立刻放下手头的工作去执行！',
		                showCancel: false,
		                confirmText: '立刻遵命！',
		                confirmColor: '#FF6B6B'
		            });
		            
		            // 如果你想更醒目，还可以加上超长震动反馈
		            uni.vibrateLong();
		            setTimeout(() => { uni.vibrateLong(); }, 1000);
		        });
		
        
        // 🌟 新增：App启动时获取手机的推送 CID
        uni.getPushClientId({
            success: (res) => {
                console.log('成功获取手机推送CID:', res.cid);
                uni.setStorageSync('pushClientId', res.cid);
                
                // 如果当前手机已经登录了账号，顺手把 CID 绑定到云端账号上
                const currentUser = uni.getStorageSync('currentUser');
                if (currentUser && currentUser._id) {
                    uniCloud.database().collection('star_users').doc(currentUser._id).update({
                        pushClientId: res.cid
                    }).catch(err => { console.log('CID更新失败', err) });
                }
            },
            fail: (err) => {
                console.log('获取CID失败(如果在电脑浏览器运行失败是正常的):', err);
            }
        });
    },
    onShow: function() {
        console.log('App Show');
    },
    onHide: function() {
        console.log('App Hide');
    }
}
</script>

<style>
/* 全局样式表依然保留 */
@import './app.css';
</style>