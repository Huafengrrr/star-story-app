'use strict';
const db = uniCloud.database();

exports.main = async (event, context) => {
    // 接收前端传来的数据：接收人的ID，以及使用的券名
    const { receiverId, ticketName } = event;

    // 1. 去数据库里找到接收人的手机 CID
    const userRes = await db.collection('star_users').doc(receiverId).get();
    if (!userRes.data || userRes.data.length === 0 || !userRes.data[0].pushClientId) {
        return { code: -1, msg: '找不到对方的手机CID，无法推送' };
    }
    const targetCid = userRes.data[0].pushClientId;

    // 2. 召唤 UniPush 2.0 发射系统级通知！
    const pushManager = uniCloud.getPushManager({ appId: context.APPID });
    
    try {
        const pushRes = await pushManager.sendMessage({
            "push_clientid": targetCid, // 发给谁
            "title": "⚠️ 星空警报：特权生效！", // 手机弹窗的加粗标题
            "content": `报告！宝宝刚刚对你使用了一张【${ticketName}】，请立刻放下手头的工作去执行！💕`, // 弹窗内容
            "payload": { "type": "ticket" } // 附带的隐藏数据
        });
        return { code: 0, msg: '推送成功', data: pushRes };
    } catch (err) {
        return { code: -2, msg: '推送失败', err: err };
    }
};