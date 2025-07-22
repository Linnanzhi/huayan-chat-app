<template>
	<view class="container">
		<!-- 用户信息卡片 -->
		<view class="user-card">
			<view class="user-info">
				<image class="avatar" :src="userInfo.avatar" mode="aspectFill" @error="handleAvatarError"></image>
				<view class="info">
					<text class="nickname">{{userInfo.nickname || '未设置昵称'}}</text>
					<text class="username">{{userInfo.username}}</text>
				</view>
			</view>
			<view class="edit-btn" @click="goToEdit">编辑资料</view>
		</view>
		
		<!-- 功能菜单 -->
		<view class="menu-section">
			<view class="menu-title">账号设置</view>
			<view class="menu-list">
				<view class="menu-item" @click="handleLogout">
					<text class="menu-icon">🔒</text>
					<text class="menu-text">退出登录</text>
					<text class="menu-arrow">></text>
				</view>
			</view>
		</view>
		
		<view class="menu-section">
			<view class="menu-title">关于我们</view>
			<view class="menu-list">
				<view class="menu-item">
					<text class="menu-icon">📱</text>
					<text class="menu-text">版本信息</text>
					<text class="menu-value">v1.0.0</text>
				</view>
				<view class="menu-item">
					<text class="menu-icon">📄</text>
					<text class="menu-text">用户协议</text>
					<text class="menu-arrow">></text>
				</view>
				<view class="menu-item">
					<text class="menu-icon">🔒</text>
					<text class="menu-text">隐私政策</text>
					<text class="menu-arrow">></text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			userInfo: {
				username: '',
				nickname: '',
				avatar: 'http://localhost:8562/default-avatar.png'
			}
		}
	},
	onShow() {
		this.getUserInfo();
	},
	methods: {
		getUserInfo() {
			try {
				const userInfoStr = uni.getStorageSync('userInfo');
				if (userInfoStr) {
					const userInfo = JSON.parse(userInfoStr);
					// 如果头像为空，使用默认头像
					if (!userInfo.avatar) {
						userInfo.avatar = 'http://localhost:8562/default-avatar.png';
					}
					this.userInfo = userInfo;
				}
			} catch (error) {
				console.error('获取用户信息失败:', error);
				this.userInfo.avatar = 'http://localhost:8562/default-avatar.png';
			}
		},
		handleAvatarError() {
			console.error('头像加载失败，使用默认头像');
			this.userInfo.avatar = 'http://localhost:8562/default-avatar.png';
		},
		goToEdit() {
			uni.navigateTo({
				url: '/pages/profile/edit'
			});
		},
		handleLogout() {
			uni.showModal({
				title: '提示',
				content: '确定要退出登录吗？',
				success: (res) => {
					if (res.confirm) {
						// 清除登录信息
						uni.removeStorageSync('token');
						uni.removeStorageSync('userInfo');
						// 跳转到登录页
						uni.reLaunch({
							url: '/pages/login/login'
						});
					}
				}
			});
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

.user-card {
	background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
	padding: 40rpx;
	margin-bottom: 20rpx;
	position: relative;
}

.user-info {
	display: flex;
	align-items: center;
}

.avatar {
	width: 120rpx;
	height: 120rpx;
	border-radius: 60rpx;
	margin-right: 30rpx;
	border: 4rpx solid rgba(255, 255, 255, 0.3);
}

.info {
	flex: 1;
}

.username {
	font-size: 20rpx;
	font-weight: 400;
	color: #ffffff;
	margin-bottom: 10rpx;
	display: block;
}

.nickname {
	font-size: 36rpx;
	font-weight: 600;
	color: rgba(255, 255, 255, 0.8);
}

.edit-btn {
	position: absolute;
	right: 40rpx;
	top: 60rpx;
	background-color: rgba(255, 255, 255, 0.2);
	color: #ffffff;
	font-size: 24rpx;
	padding: 8rpx 20rpx;
	border-radius: 30rpx;
}

.menu-section {
	background-color: #ffffff;
	margin-bottom: 20rpx;
	border-radius: 20rpx;
	overflow: hidden;
}

.menu-title {
	font-size: 28rpx;
	color: #999;
	padding: 20rpx;
	font-weight: 500;
}

.menu-list {
	background-color: #ffffff;
}

.menu-item {
	display: flex;
	align-items: center;
	padding: 30rpx 20rpx;
	border-bottom: 1rpx solid #f5f5f5;
}

.menu-icon {
	font-size: 36rpx;
	margin-right: 20rpx;
}

.menu-text {
	flex: 1;
	font-size: 30rpx;
	color: #333;
}

.menu-arrow {
	font-size: 28rpx;
	color: #999;
}

.menu-value {
	font-size: 28rpx;
	color: #999;
	margin-right: 20rpx;
}
</style> 