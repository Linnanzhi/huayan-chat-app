<template>
	<view class="container">
		<!-- 顶部搜索栏 -->
		<view class="search-bar">
			<view class="search-input">
				<text class="search-icon">🔍</text>
				<input type="text" placeholder="搜索联系人" placeholder-class="placeholder" />
			</view>
		</view>
		
		<!-- 快捷功能区 -->
		<view class="quick-actions">
			<view class="action-item" @click="goToNewFriends">
				<view class="action-icon new-friends">
					<text class="icon-text">👥</text>
					<view class="badge" v-if="newFriendCount > 0">{{newFriendCount}}</view>
				</view>
				<text class="action-text">新的朋友</text>
			</view>
			<view class="action-item" @click="goToGroups">
				<view class="action-icon groups">
					<text class="icon-text">👥</text>
				</view>
				<text class="action-text">群聊</text>
			</view>
			<view class="action-item" @click="goToTags">
				<view class="action-icon tags">
					<text class="icon-text">🏷️</text>
				</view>
				<text class="action-text">标签</text>
			</view>
			<view class="action-item" @click="goToOfficial">
				<view class="action-icon official">
					<text class="icon-text">📢</text>
				</view>
				<text class="action-text">公众号</text>
			</view>
		</view>
		
		<!-- 联系人列表 -->
		<scroll-view class="contacts-list" scroll-y>
			<!-- 好友列表 -->
			<view class="section">
				<view class="section-header">
					<text class="section-title">我的好友</text>
					<text class="count">({{contactsList.length}})</text>
				</view>
				<view class="contact-item" v-for="(item, index) in contactsList" :key="index" @click="goToChat(item)">
					<image class="avatar" 
						:src="item.avatar || '/static/default-avatar.png'" 
						mode="aspectFill"
						@error="handleAvatarError(index)">
					</image>
					<view class="contact-info">
						<text class="username">{{item.nickname || item.userid}}</text>
						<text class="status">{{item.status || '离线'}}</text>
					</view>
					<view class="action-btn" @click.stop="goToChat(item)">聊天</view>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import wsUtil from '../../utils/websocket.js'

export default {
	data() {
		return {
			newFriendCount: 0,
			contactsList: []
		}
	},
	onLoad() {
		this.initWebSocket();
		this.loadContacts();
		this.checkNewFriends();
	},
	onUnload() {
		// 页面卸载时移除WebSocket事件监听
		wsUtil.off('getFriends');
		wsUtil.off('friendRequest');
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
			// 监听好友申请
			wsUtil.on('friendRequest', (data) => {
				console.log('收到好友申请:', data);
				this.checkNewFriends();
			});
		},
		
		// 加载联系人列表
		async loadContacts() {
			try {
				const userInfoStr = uni.getStorageSync('userInfo');
				if (!userInfoStr) {
					throw new Error('未找到用户信息');
				}
				
				const userInfo = JSON.parse(userInfoStr);
				
				// 发送获取好友列表请求
				const success = await wsUtil.send({
					biztype: 'getFriends',
					token: userInfo.token
				});
				
				if (!success) {
					throw new Error('发送请求失败');
				}
				
				// 等待响应
				const response = await new Promise((resolve, reject) => {
					const timeout = setTimeout(() => {
						wsUtil.off('getFriends', handler);
						reject(new Error('请求超时'));
					}, 5000);
					
					const handler = (data) => {
						clearTimeout(timeout);
						wsUtil.off('getFriends', handler);
						resolve(data);
					};
					
					wsUtil.on('getFriends', handler);
				});
				
				if (response.success) {
					console.log('获取到好友列表数据:', response.friends);
					// 确保每个联系人都有头像属性，并处理头像URL
					this.contactsList = (response.friends || []).map(friend => {
						// 如果头像URL是相对路径，添加基础URL
						let avatarUrl = friend.avatar;
						if (avatarUrl && avatarUrl.indexOf('http') !== 0) {
							avatarUrl = `http://localhost:8562${avatarUrl[0] === '/' ? '' : '/'}${avatarUrl}`;
						}
						
						return {
							...friend,
							avatar: avatarUrl || '/static/default-avatar.png'
						};
					});
					console.log('处理后的好友列表:', this.contactsList);
				} else {
					throw new Error(response.message || '获取好友列表失败');
				}
			} catch (error) {
				console.error('加载联系人列表失败:', error);
				uni.showToast({
					title: error.message || '加载联系人列表失败',
					icon: 'none'
				});
				this.contactsList = [];
			}
		},
		
		// 检查新朋友数量
		async checkNewFriends() {
			try {
				const userInfoStr = uni.getStorageSync('userInfo');
				if (!userInfoStr) {
					throw new Error('未找到用户信息');
				}
				
				const userInfo = JSON.parse(userInfoStr);
				
				// 发送获取好友申请数量请求
				const success = await wsUtil.send({
					biztype: 'getFriendRequests',
					token: userInfo.token
				});
				
				if (!success) {
					throw new Error('发送请求失败');
				}
				
				// 等待响应
				const response = await new Promise((resolve, reject) => {
					const timeout = setTimeout(() => {
						wsUtil.off('getFriendRequests', handler);
						reject(new Error('请求超时'));
					}, 5000);
					
					const handler = (data) => {
						clearTimeout(timeout);
						wsUtil.off('getFriendRequests', handler);
						resolve(data);
					};
					
					wsUtil.on('getFriendRequests', handler);
				});
				
				if (response.success) {
					this.newFriendCount = response.requests ? response.requests.length : 0;
				} else {
					throw new Error(response.message || '获取新朋友数量失败');
				}
			} catch (error) {
				console.error('检查新朋友数量失败:', error);
				this.newFriendCount = 0;
			}
		},
		
		// 跳转到新朋友页面
		goToNewFriends() {
			uni.navigateTo({
				url: '/pages/contacts/new-friends'
			});
		},
		
		// 跳转到群聊页面
		goToGroups() {
			uni.navigateTo({
				url: '/pages/contacts/groups'
			});
		},
		
		// 跳转到标签页面
		goToTags() {
			uni.navigateTo({
				url: '/pages/contacts/tags'
			});
		},
		
		// 跳转到公众号页面
		goToOfficial() {
			uni.navigateTo({
				url: '/pages/contacts/official'
			});
		},
		
		// 开始聊天
		startChat(contact) {
			// 跳转到聊天页面，并传递联系人信息
			uni.navigateTo({
				url: `/pages/chat/chat-detail.vue?targetUserid=${contact.userid || contact.username}&targetUsername=${contact.username}&targetNickname=${contact.nickname || ''}`
			});
		},
		goToChat(user) {
			uni.navigateTo({
				url: `/pages/chat/chat-detail?userid=${user.userid}&nickname=${user.nickname}&avatar=${encodeURIComponent(user.avatar || '')}`
			})
		},
		
		// 处理头像加载错误
		handleAvatarError(index) {
			console.log('头像加载失败，索引:', index);
			// 当头像加载失败时，将其设置为默认头像
			if (this.contactsList[index]) {
				this.$set(this.contactsList[index], 'avatar', '/static/default-avatar.png');
				console.log('已设置默认头像');
			}
		}
	}
}
</script>

<style>
.container {
	height: 100vh;
	background-color: #f8f8f8;
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

.quick-actions {
	display: flex;
	justify-content: space-around;
	padding: 30rpx 20rpx;
	background-color: #ffffff;
	margin-bottom: 20rpx;
}

.action-item {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.action-icon {
	width: 100rpx;
	height: 100rpx;
	border-radius: 20rpx;
	display: flex;
	justify-content: center;
	align-items: center;
	margin-bottom: 10rpx;
	position: relative;
}

.new-friends {
	background-color: #4facfe;
}

.groups {
	background-color: #00c6fb;
}

.tags {
	background-color: #00f2fe;
}

.official {
	background-color: #005bea;
}

.icon-text {
	font-size: 50rpx;
	color: #ffffff;
}

.badge {
	position: absolute;
	top: -10rpx;
	right: -10rpx;
	background-color: #ff4d4f;
	color: #ffffff;
	font-size: 24rpx;
	min-width: 36rpx;
	height: 36rpx;
	border-radius: 18rpx;
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 0 6rpx;
}

.action-text {
	font-size: 24rpx;
	color: #333;
}

.contacts-list {
	height: calc(100vh - 300rpx);
}

.section {
	margin-bottom: 20rpx;
	background-color: #ffffff;
}

.section-header {
	padding: 20rpx;
	border-bottom: 1rpx solid #f5f5f5;
}

.section-title {
	font-size: 28rpx;
	color: #999;
	font-weight: 500;
}

.count {
	font-size: 24rpx;
	color: #999;
	margin-left: 10rpx;
}

.contact-item {
	display: flex;
	align-items: center;
	padding: 20rpx;
	border-bottom: 1rpx solid #f5f5f5;
}

.avatar {
	width: 100rpx;
	height: 100rpx;
	border-radius: 50%;
	margin-right: 20rpx;
}

.contact-info {
	flex: 1;
}

.username {
	font-size: 32rpx;
	font-weight: 500;
	color: #333;
	margin-bottom: 6rpx;
}

.status {
	font-size: 24rpx;
	color: #999;
}

.action-btn {
	background-color: #4facfe;
	color: #ffffff;
	font-size: 28rpx;
	padding: 10rpx 30rpx;
	border-radius: 30rpx;
}
</style> 