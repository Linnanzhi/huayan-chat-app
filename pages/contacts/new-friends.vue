<template>
	<view class="container">
		<!-- 顶部搜索栏 -->
		<view class="search-bar">
			<view class="search-input">
				<text class="search-icon">🔍</text>
				<input 
					type="text" 
					v-model="searchKeyword"
					placeholder="搜索用户名" 
					placeholder-class="placeholder"
					@input="handleSearch"
				/>
			</view>
		</view>
		
		<!-- 搜索结果 -->
		<view class="search-results" v-if="searchResults.length > 0">
			<view class="section-header">
				<text class="section-title">搜索结果</text>
			</view>
			<view class="contact-item" v-for="(item, index) in searchResults" :key="'search-'+index">
				<image class="avatar" :src="getAvatarUrl(item.avatar)" mode="aspectFill" @error="handleAvatarError"></image>
				<view class="contact-info">
					<text class="username">{{item.nickname || item.userid}}</text>
					<text class="status">{{item.userid}}</text>
				</view>
				<view class="action-btn" @click="sendFriendRequest(item)">添加</view>
			</view>
		</view>
		
		<!-- 好友申请列表 -->
		<view class="section" v-if="friendRequests.length > 0">
			<view class="section-header">
				<text class="section-title">好友申请</text>
				<text class="count">({{friendRequests.length}})</text>
			</view>
			<view class="contact-item" v-for="(item, index) in friendRequests" :key="'request-'+index">
				<image class="avatar" :src="item.avatar || '/static/default-avatar.png'" mode="aspectFill"></image>
				<view class="contact-info">
					<text class="username">{{item.nickname || item.userid}}</text>
					<text class="status">{{item.message || '请求添加您为好友'}}</text>
				</view>
				<view class="action-group">
					<view class="action-btn accept" @click="handleFriendRequest(item, true)">同意</view>
					<view class="action-btn reject" @click="handleFriendRequest(item, false)">拒绝</view>
				</view>
			</view>
		</view>
		
		<!-- 已发送的好友申请 -->
		<view class="section" v-if="sentRequests.length > 0">
			<view class="section-header">
				<text class="section-title">已发送的申请</text>
				<text class="count">({{sentRequests.length}})</text>
			</view>
			<view class="contact-item" v-for="(item, index) in sentRequests" :key="'sent-'+index">
				<image class="avatar" :src="getAvatarUrl(item.avatar)" mode="aspectFill" @error="handleAvatarError"></image>
				<view class="contact-info">
					<text class="username">{{item.nickname || item.userid}}</text>
					<text class="status">{{item.status || '等待对方处理'}}</text>
				</view>
				<view class="action-btn pending" v-if="item.status === '等待对方处理'">等待中</view>
				<view class="action-btn accepted" v-else-if="item.status === '已接受'">已接受</view>
				<view class="action-btn rejected" v-else-if="item.status === '已拒绝'">已拒绝</view>
			</view>
		</view>
		
		<!-- 空状态提示 -->
		<view class="empty-state" v-if="searchResults.length === 0 && friendRequests.length === 0 && sentRequests.length === 0">
			<image class="empty-icon" src="/static/empty-friends.png" mode="aspectFit"></image>
			<text class="empty-text">暂无好友申请</text>
			<text class="empty-tip">搜索用户名添加新朋友</text>
		</view>
	</view>
</template>

<script>
import wsUtil from '../../utils/websocket.js'

export default {
	data() {
		return {
			searchKeyword: '',
			searchResults: [],
			friendRequests: [],
			sentRequests: [],
			searchTimeout: null,
			defaultAvatar: 'http://localhost:8562/default-avatar.png'
		}
	},
	onLoad() {
		this.initWebSocket();
		this.loadFriendRequests();
		this.loadSentRequests();
	},
	onUnload() {
		// 页面卸载时移除WebSocket事件监听
		wsUtil.off('friendRequest');
		wsUtil.off('friendRequestResponse');
		wsUtil.off('searchUser');
	},
	methods: {
		// 初始化WebSocket连接
		async initWebSocket() {
			if (!wsUtil.isConnected) {
				try {
					await wsUtil.init('ws://localhost:8561');
					console.log('WebSocket连接成功');
					this.setupWebSocketListeners();
				} catch (error) {
					console.error('WebSocket连接失败:', error);
					uni.showToast({
						title: '网络连接失败',
						icon: 'none'
					});
				}
			} else {
				this.setupWebSocketListeners();
			}
		},
		
		// 设置WebSocket事件监听
		setupWebSocketListeners() {
			// 监听好友申请
			wsUtil.on('friendRequest', (data) => {
				console.log('收到好友申请:', data);
				this.friendRequests.unshift(data);
			});
			
			// 监听好友申请响应
			wsUtil.on('friendRequestResponse', (data) => {
				console.log('收到好友申请响应:', data);
				// 更新已发送的申请状态
				const index = this.sentRequests.findIndex(item => item.requestId === data.requestId);
				if (index !== -1) {
					this.sentRequests[index].status = data.accepted ? '已接受' : '已拒绝';
				}
				
				if (data.accepted) {
					uni.showToast({
						title: '对方已同意好友申请',
						icon: 'success'
					});
				} else {
					uni.showToast({
						title: '对方已拒绝好友申请',
						icon: 'none'
					});
				}
			});
			
			// 监听搜索结果
			wsUtil.on('searchUser', (data) => {
				console.log('收到搜索结果:', data);
				if (data.success) {
					this.searchResults = data.users || [];
				} else {
					this.searchResults = [];
					uni.showToast({
						title: data.message || '搜索失败',
						icon: 'none'
					});
				}
			});
		},
		
		// 加载好友申请列表
		async loadFriendRequests() {
			try {
				const userInfoStr = uni.getStorageSync('userInfo');
				if (!userInfoStr) {
					throw new Error('未找到用户信息');
				}
				
				const userInfo = JSON.parse(userInfoStr);
				
				// 发送获取好友申请列表请求
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
					this.friendRequests = response.requests || [];
				} else {
					throw new Error(response.message || '获取好友申请列表失败');
				}
			} catch (error) {
				console.error('加载好友申请列表失败:', error);
				uni.showToast({
					title: error.message || '加载好友申请列表失败',
					icon: 'none'
				});
			}
		},
		
		// 加载已发送的好友申请
		async loadSentRequests() {
			try {
				const userInfoStr = uni.getStorageSync('userInfo');
				if (!userInfoStr) {
					throw new Error('未找到用户信息');
				}
				
				const userInfo = JSON.parse(userInfoStr);
				
				// 发送获取已发送的好友申请列表请求
				const success = await wsUtil.send({
					biztype: 'getSentRequests',
					token: userInfo.token
				});
				
				if (!success) {
					throw new Error('发送请求失败');
				}
				
				// 等待响应
				const response = await new Promise((resolve, reject) => {
					const timeout = setTimeout(() => {
						wsUtil.off('getSentRequests', handler);
						reject(new Error('请求超时'));
					}, 5000);
					
					const handler = (data) => {
						clearTimeout(timeout);
						wsUtil.off('getSentRequests', handler);
						resolve(data);
					};
					
					wsUtil.on('getSentRequests', handler);
				});
				
				if (response.success) {
					// 处理头像URL
					this.sentRequests = (response.requests || []).map(request => ({
						...request,
						avatar: this.getAvatarUrl(request.avatar)
					}));
				} else {
					throw new Error(response.message || '获取已发送的好友申请列表失败');
				}
			} catch (error) {
				console.error('加载已发送的好友申请列表失败:', error);
				uni.showToast({
					title: error.message || '加载已发送的好友申请列表失败',
					icon: 'none'
				});
			}
		},
		
		// 处理搜索输入
		handleSearch() {
			// 清除之前的定时器
			if (this.searchTimeout) {
				clearTimeout(this.searchTimeout);
			}
			
			// 设置新的定时器，延迟500ms执行搜索
			this.searchTimeout = setTimeout(() => {
				if (this.searchKeyword.trim()) {
					this.searchUsers();
				} else {
					this.searchResults = [];
				}
			}, 500);
		},
		
		// 搜索用户
		async searchUsers() {
			try {
				const userInfoStr = uni.getStorageSync('userInfo');
				if (!userInfoStr) {
					throw new Error('未找到用户信息');
				}
				
				const userInfo = JSON.parse(userInfoStr);
				
				// 发送搜索请求
				const success = await wsUtil.send({
					biztype: 'searchUser',
					token: userInfo.token,
					keyword: this.searchKeyword.trim()
				});
				
				if (!success) {
					throw new Error('发送搜索请求失败');
				}
				
				// 等待响应
				const response = await new Promise((resolve, reject) => {
					const timeout = setTimeout(() => {
						wsUtil.off('searchUser', handler);
						reject(new Error('请求超时'));
					}, 5000);
					
					const handler = (data) => {
						clearTimeout(timeout);
						wsUtil.off('searchUser', handler);
						resolve(data);
					};
					
					wsUtil.on('searchUser', handler);
				});
				
				if (response.success) {
					this.searchResults = response.users || [];
					if (this.searchResults.length === 0) {
						uni.showToast({
							title: '未找到相关用户',
							icon: 'none'
						});
					}
				} else {
					throw new Error(response.message || '搜索失败');
				}
			} catch (error) {
				console.error('搜索用户失败:', error);
				uni.showToast({
					title: error.message || '搜索失败',
					icon: 'none'
				});
				this.searchResults = [];
			}
		},
		
		// 发送好友申请
		async sendFriendRequest(user) {
			try {
				const userInfoStr = uni.getStorageSync('userInfo');
				if (!userInfoStr) {
					throw new Error('未找到用户信息');
				}
				
				const userInfo = JSON.parse(userInfoStr);
				
				// 发送好友申请
				const success = await wsUtil.send({
					biztype: 'sendFriendRequest',
					token: userInfo.token,
					targetUserid: user.userid,
					message: `我是${userInfo.nickname || userInfo.userid}，请求添加您为好友`
				});
				
				if (!success) {
					throw new Error('发送好友申请失败');
				}
				
				// 等待响应
				const response = await new Promise((resolve, reject) => {
					const timeout = setTimeout(() => {
						wsUtil.off('sendFriendRequest', handler);
						reject(new Error('请求超时'));
					}, 5000);
					
					const handler = (data) => {
						clearTimeout(timeout);
						wsUtil.off('sendFriendRequest', handler);
						resolve(data);
					};
					
					wsUtil.on('sendFriendRequest', handler);
				});
				
				if (response.success) {
					uni.showToast({
						title: '好友申请已发送',
						icon: 'success'
					});
					
					// 添加到已发送的申请列表
					this.sentRequests.unshift({
						...user,
						requestId: response.requestId,
						status: '等待对方处理'
					});
					
					// 从搜索结果中移除该用户
					this.searchResults = this.searchResults.filter(item => item.userid !== user.userid);
				} else {
					throw new Error(response.message || '发送好友申请失败');
				}
			} catch (error) {
				console.error('发送好友申请失败:', error);
				uni.showToast({
					title: error.message || '发送好友申请失败',
					icon: 'none'
				});
			}
		},
		
		// 处理好友申请
		async handleFriendRequest(request, accept) {
			try {
				const userInfoStr = uni.getStorageSync('userInfo');
				if (!userInfoStr) {
					throw new Error('未找到用户信息');
				}
				
				const userInfo = JSON.parse(userInfoStr);
				
				// 发送处理好友申请请求
				const success = await wsUtil.send({
					biztype: 'handleFriendRequest',
					token: userInfo.token,
					requestId: request.requestId,
					accepted: accept
				});
				
				if (!success) {
					throw new Error('处理好友申请失败');
				}
				
				// 等待响应
				const response = await new Promise((resolve, reject) => {
					const timeout = setTimeout(() => {
						wsUtil.off('handleFriendRequest', handler);
						reject(new Error('请求超时'));
					}, 5000);
					
					const handler = (data) => {
						clearTimeout(timeout);
						wsUtil.off('handleFriendRequest', handler);
						resolve(data);
					};
					
					wsUtil.on('handleFriendRequest', handler);
				});
				
				if (response.success) {
					// 从申请列表中移除该申请
					this.friendRequests = this.friendRequests.filter(item => item.requestId !== request.requestId);
					
					if (accept) {
						uni.showToast({
							title: '已同意好友申请',
							icon: 'success'
						});
					} else {
						uni.showToast({
							title: '已拒绝好友申请',
							icon: 'none'
						});
					}
				} else {
					throw new Error(response.message || '处理好友申请失败');
				}
			} catch (error) {
				console.error('处理好友申请失败:', error);
				uni.showToast({
					title: error.message || '处理好友申请失败',
					icon: 'none'
				});
			}
		},
		
		// 获取头像URL
		getAvatarUrl(avatar) {
			if (!avatar) {
				return this.defaultAvatar;
			}
			if (avatar.startsWith('http')) {
				return avatar;
			}
			return 'http://localhost:8562' + (avatar.startsWith('/') ? '' : '/') + avatar;
		},
		
		// 处理头像加载错误
		handleAvatarError() {
			console.error('头像加载失败，使用默认头像');
			return this.defaultAvatar;
		}
	}
}
</script>

<style>
.container {
	min-height: 100vh;
	background-color: #f8f8f8;
	padding-bottom: 40rpx;
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

.search-results {
	background-color: #ffffff;
	margin-bottom: 20rpx;
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

.action-group {
	display: flex;
	gap: 10rpx;
}

.action-btn.accept {
	background-color: #4facfe;
}

.action-btn.reject {
	background-color: #ff4d4f;
}

.action-btn.pending {
	background-color: #ffa940;
}

.action-btn.accepted {
	background-color: #52c41a;
}

.action-btn.rejected {
	background-color: #d9d9d9;
}

.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 100rpx 0;
}

.empty-icon {
	width: 200rpx;
	height: 200rpx;
	margin-bottom: 30rpx;
}

.empty-text {
	font-size: 32rpx;
	color: #333;
	margin-bottom: 10rpx;
}

.empty-tip {
	font-size: 28rpx;
	color: #999;
}
</style> 