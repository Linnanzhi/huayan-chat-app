<template>
	<view class="chat-container">
		<!-- 顶部搜索栏 -->
		<view class="search-bar">
			<view class="search-input">
				<text class="search-icon">🔍</text>
				<input type="text" placeholder="搜索聊天" placeholder-class="placeholder" />
			</view>
		</view>
		
		<!-- 聊天列表 -->
		<view class="chat-list">
			<view v-if="loading" class="loading">加载中...</view>
			<view v-else-if="chatList.length === 0" class="empty">暂无聊天记录</view>
			<view v-else class="chat-item" v-for="chat in chatList" :key="`${chat.from_userid}-${chat.to_userid}-${chat.last_time}`" @tap="goToChatDetail(chat)">
				<image class="avatar" :src="chat.from_userid === userInfo.userid ? chat.to_avatar : chat.from_avatar || '/static/default-avatar.png'" mode="aspectFill"></image>
				<view class="chat-info">
					<view class="chat-header">
						<text class="nickname">{{chat.from_userid === userInfo.userid ? chat.to_nickname : chat.from_nickname}}</text>
						<text class="time">{{formatTime(chat.last_time)}}</text>
					</view>
					<view class="chat-content">
						<text class="last-message">{{formatLastMessage(chat.last_message, chat.last_type, chat.original_name)}}</text>
						<text v-if="chat.unread_count > 0" class="unread-count">{{chat.unread_count}}</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import wsUtil from '../../utils/websocket.js'

export default {
	data() {
		return {
			chatList: [],
			loading: false,
			userInfo: null
		}
	},
	onLoad() {
		// 获取用户信息
		const userInfoStr = uni.getStorageSync('userInfo')
		if (userInfoStr) {
			try {
				this.userInfo = JSON.parse(userInfoStr)
			} catch (e) {
				console.error('解析用户信息失败:', e)
			}
		}
		this.initWebSocket();
		this.loadChatList();
	},
	onShow() {
		// 每次页面显示时刷新会话列表
		this.loadChatList();
	},
	onUnload() {
		// 页面卸载时移除WebSocket事件监听
		wsUtil.off('getChatList');
		wsUtil.off('newMessage');
	},
	methods: {
		// 初始化WebSocket连接
		async initWebSocket() {
			const status = wsUtil.getConnectionStatus();
			if (status === 'disconnected' || status === 'error') {
				uni.showToast({
					title: '正在重新连接...',
					icon: 'none'
				});
			}
			this.setupWebSocketListeners();
		},
		
		// 设置WebSocket事件监听
		setupWebSocketListeners() {
			// 监听新消息
			wsUtil.on('newMessage', (data) => {
				console.log('收到新消息:', data);
				this.loadChatList();
			});
			
			// 监听会话列表更新
			wsUtil.on('getChatList', (data) => {
				if (data.success) {
					this.chatList = data.chats || [];
					console.log('获取到的会话列表:', this.chatList);
				}
			});
		},
		
		// 加载会话列表
		async loadChatList() {
			if (this.loading) return;
			
			this.loading = true;
			try {
				if (!this.userInfo) {
					throw new Error('未找到用户信息');
				}
				
				// 发送获取会话列表请求
				const success = await wsUtil.send({
					biztype: 'getChatList',
					token: this.userInfo.token
				});
				
				if (!success) {
					throw new Error('发送请求失败');
				}
			} catch (error) {
				console.error('加载会话列表失败:', error);
				uni.showToast({
					title: error.message || '加载会话列表失败',
					icon: 'none'
				});
			} finally {
				this.loading = false;
			}
		},
		
		// 格式化时间
		formatTime(timestamp) {
			if (!timestamp) return '';
			const date = new Date(timestamp);
			const now = new Date();
			const diff = now - date;
			
			// 今天
			if (diff < 24 * 60 * 60 * 1000) {
				return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
			}
			// 昨天
			if (diff < 48 * 60 * 60 * 1000) {
				return '昨天';
			}
			// 一周内
			if (diff < 7 * 24 * 60 * 60 * 1000) {
				const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
				return days[date.getDay()];
			}
			// 更早
			return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
		},
		
		// 跳转到聊天页面
		goToChatDetail(chat) {
			const targetUserid = chat.from_userid === this.userInfo.userid ? chat.to_userid : chat.from_userid;
			const targetNickname = chat.from_userid === this.userInfo.userid ? chat.to_nickname : chat.from_nickname;
			const targetAvatar = chat.from_userid === this.userInfo.userid ? chat.to_avatar : chat.from_avatar;
			
			uni.navigateTo({
				url: `/pages/chat/chat-detail?userid=${targetUserid}&nickname=${targetNickname || ''}&avatar=${targetAvatar || ''}`
			});
		},
		
		// 格式化最后一条消息
		formatLastMessage(message, type, originalName) {
			if (!message) return '';
			
			switch (type) {
				case 'image':
					return '[图片]';
				case 'file':
					return `[文件]${originalName || message.split('/').pop() || '未知文件'}`;
				default:
					return message;
			}
		}
	}
}
</script>

<style>
.chat-container {
	padding: 20rpx;
}

.search-bar {
	padding: 20rpx;
	background-color: #ffffff;
	position: sticky;
	top: 0;
	z-index: 100;
}

.search-input {
	display: flex;
	align-items: center;
	background-color: #f5f5f5;
	border-radius: 30rpx;
	padding: 10rpx 20rpx;
}

.search-icon {
	font-size: 32rpx;
	margin-right: 10rpx;
	color: #999;
}

.placeholder {
	color: #999;
	font-size: 28rpx;
}

.chat-list {
	background-color: #fff;
	border-radius: 10rpx;
	overflow: hidden;
}

.chat-item {
	display: flex;
	padding: 20rpx;
	border-bottom: 1rpx solid #f5f5f5;
}

.avatar {
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
	margin-right: 20rpx;
}

.chat-info {
	flex: 1;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
}

.chat-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.nickname {
	font-size: 32rpx;
	color: #333;
	font-weight: bold;
}

.time {
	font-size: 24rpx;
	color: #999;
}

.chat-content {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-top: 10rpx;
}

.last-message {
	font-size: 28rpx;
	color: #666;
	flex: 1;
	margin-right: 20rpx;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.unread-count {
	background-color: #f56c6c;
	color: #fff;
	font-size: 24rpx;
	padding: 4rpx 12rpx;
	border-radius: 20rpx;
	min-width: 36rpx;
	text-align: center;
}

.loading, .empty {
	text-align: center;
	padding: 40rpx;
	color: #999;
	font-size: 28rpx;
}
</style> 