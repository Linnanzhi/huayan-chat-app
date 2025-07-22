<template>
	<view class="container">
		<view class="form-section">
			<!-- 头像上传 -->
			<view class="avatar-upload">
				<view class="upload-title">头像</view>
				<view class="upload-content">
					<image class="preview-avatar" :src="avatarUrl" mode="aspectFill" @click="chooseAvatar" @error="handleImageError"></image>
				</view>
			</view>
			
			<!-- 昵称输入 -->
			<view class="form-item">
				<text class="form-label">昵称</text>
				<input class="form-input" v-model="tempNickname" placeholder="请输入昵称" />
			</view>
		</view>
		
		<!-- 保存按钮 -->
		<view class="save-btn" @click="saveProfile">保存</view>
	</view>
</template>

<script>
import wsUtil from '@/utils/websocket.js'

export default {
	data() {
		return {
			userInfo: {
				nickname: '',
				avatar: '',
				token: '',
				userid: ''
			},
			tempNickname: '',
			isUploading: false,
			avatarUrl: 'http://localhost:8562/default-avatar.png'
		}
	},
	watch: {
		'userInfo.avatar': {
			immediate: true,
			handler(newVal) {
				if (newVal) {
					this.validateAndSetAvatar(newVal);
				} else {
					this.avatarUrl = 'http://localhost:8562/default-avatar.png';
				}
			}
		}
	},
	onLoad() {
		this.getUserInfo();
		this.initWebSocket();
	},
	methods: {
		initWebSocket() {
			// 检查 WebSocket 是否已连接
			if (!uni.$ws) {
				// 导入 WebSocket 工具类
				import('@/utils/websocket.js').then(wsModule => {
					const wsUtil = wsModule.default;
					// 初始化 WebSocket 连接
					wsUtil.init();
					// 保存到全局变量
					uni.$ws = wsUtil;
				}).catch(error => {
					console.error('初始化 WebSocket 失败:', error);
					uni.showToast({
						title: '网络连接失败',
						icon: 'none'
					});
				});
			}
		},
		getUserInfo() {
			try {
				const userInfoStr = uni.getStorageSync('userInfo');
				if (userInfoStr) {
					const userInfo = JSON.parse(userInfoStr);
					this.userInfo = userInfo;
					this.tempNickname = userInfo.nickname;
					
					// 验证头像 URL
					if (userInfo.avatar) {
						if (!userInfo.avatar.startsWith('http')) {
							// 如果头像 URL 是相对路径，转换为完整 URL
							userInfo.avatar = 'http://localhost:8562' + userInfo.avatar;
							// 更新存储的用户信息
							uni.setStorageSync('userInfo', JSON.stringify(userInfo));
						}
						this.validateAndSetAvatar(userInfo.avatar);
					} else {
						this.avatarUrl = 'http://localhost:8562/default-avatar.png';
					}
				}
			} catch (error) {
				console.error('获取用户信息失败:', error);
				this.avatarUrl = 'http://localhost:8562/default-avatar.png';
			}
		},
		validateAndSetAvatar(url) {
			if (!url) {
				this.avatarUrl = 'http://localhost:8562/default-avatar.png';
				return;
			}
			
			// 验证图片 URL
			uni.getImageInfo({
				src: url,
				success: () => {
					this.avatarUrl = url;
				},
				fail: (err) => {
					console.error('图片验证失败:', err);
					this.avatarUrl = 'http://localhost:8562/default-avatar.png';
				}
			});
		},
		handleImageError(e) {
			console.error('图片加载失败:', e);
			this.avatarUrl = 'http://localhost:8562/default-avatar.png';
		},
		async chooseAvatar() {
			if (this.isUploading) {
				uni.showToast({
					title: '正在上传中...',
					icon: 'none'
				});
				return;
			}
			
			this.isUploading = true;
			let loadingShown = false;
			
			try {
				// 选择图片
				const res = await uni.chooseImage({
					count: 1,
					sizeType: ['compressed'],
					sourceType: ['album', 'camera']
				});
				
				if (!res || !res.tempFilePaths || res.tempFilePaths.length === 0) {
					uni.showToast({
						title: '选择图片失败',
						icon: 'none'
					});
					return;
				}
				
				const tempFilePath = res.tempFilePaths[0];
				
				// 检查文件大小
				const fileInfo = await uni.getFileInfo({
					filePath: tempFilePath
				});
				
				if (fileInfo.size > 2 * 1024 * 1024) {
					uni.showToast({
						title: '图片大小不能超过2MB',
						icon: 'none'
					});
					return;
				}
				
				loadingShown = true;
				uni.showLoading({
					title: '上传中...',
					mask: true
				});
				
				// 上传图片
				const uploadRes = await uni.uploadFile({
					url: 'http://localhost:8562/upload',
					filePath: tempFilePath,
					name: 'file',
					formData: {
						'userid': this.userInfo.userid
					},
					header: {
						'Content-Type': 'multipart/form-data',
						'Accept': 'application/json'
					}
				});
				
				console.log('上传响应:', uploadRes);
				
				if (uploadRes.statusCode !== 200) {
					throw new Error('上传失败: ' + uploadRes.errMsg);
				}
				
				const result = JSON.parse(uploadRes.data);
				if (result.code === 200) {
					// 更新头像 URL
					this.userInfo.avatar = result.data.url;
					// 保存到本地存储
					uni.setStorageSync('userInfo', JSON.stringify(this.userInfo));
					
					uni.showToast({
						title: '上传成功',
						icon: 'success'
					});
				} else {
					throw new Error(result.message || '上传失败');
				}
			} catch (error) {
				console.error('上传头像失败:', error);
				uni.showToast({
					title: error.message || '上传失败',
					icon: 'none'
				});
			} finally {
				if (loadingShown) {
					uni.hideLoading();
				}
				this.isUploading = false;
			}
		},
		async saveProfile() {
			// 检查昵称是否为空
			if (!this.tempNickname.trim()) {
				uni.showToast({
					title: '昵称不能为空',
					icon: 'none'
				});
				return;
			}
			
			// 显示加载中
			uni.showLoading({
				title: '保存中...',
				mask: true
			});
			
			try {
				// 发送更新资料请求
				const response = await this.updateProfile();
				
				if (response.code === 200) {
					// 更新成功，保存本地信息
					this.saveLocalProfile();
				} else {
					// 更新失败
					uni.showToast({
						title: response.message || '更新失败',
						icon: 'none'
					});
				}
			} catch (error) {
				console.error('更新资料失败:', error);
				uni.showToast({
					title: '更新失败',
					icon: 'none'
				});
			} finally {
				// 确保在 finally 中隐藏加载提示
				uni.hideLoading();
			}
		},
		updateProfile() {
			return new Promise((resolve, reject) => {
				let retryCount = 0;
				const maxRetries = 3;
				
				const tryUpdate = () => {
					// 设置超时
					const timeout = setTimeout(() => {
						wsUtil.off('updateProfile');
						if (retryCount < maxRetries) {
							console.log(`第${retryCount + 1}次更新超时，准备重试...`);
							retryCount++;
							tryUpdate();
						} else {
							reject(new Error('更新资料超时，请检查网络连接'));
						}
					}, 10000);
					
					// 发送更新资料请求
					const success = wsUtil.send({
						biztype: 'updateProfile',
						token: this.userInfo.token,
						nickname: this.tempNickname,
						avatar: this.userInfo.avatar,
						userid: this.userInfo.userid || this.userInfo.username
					});
					
					if (!success) {
						clearTimeout(timeout);
						if (retryCount < maxRetries) {
							console.log(`第${retryCount + 1}次发送失败，准备重试...`);
							retryCount++;
							setTimeout(tryUpdate, 1000);
						} else {
							reject(new Error('发送更新请求失败，请检查网络连接'));
						}
						return;
					}
					
					// 注册消息处理器
					wsUtil.on('updateProfile', (data) => {
						clearTimeout(timeout);
						console.log('收到更新资料响应:', data);
						
						if (data.code === 200) {
							resolve(data);
						} else {
							if (retryCount < maxRetries) {
								console.log(`第${retryCount + 1}次更新失败，准备重试...`);
								retryCount++;
								setTimeout(tryUpdate, 1000);
							} else {
								reject(new Error(data.message || '更新失败'));
							}
						}
						
						// 处理完成后移除处理器
						wsUtil.off('updateProfile');
					});
				};
				
				// 开始第一次尝试
				tryUpdate();
			});
		},
		saveLocalProfile() {
			// 更新本地用户信息
			this.userInfo.nickname = this.tempNickname;
			
			// 保存到本地存储
			uni.setStorageSync('userInfo', JSON.stringify(this.userInfo));
			
			// 更新成功，返回上一页
			uni.navigateBack();
		}
	}
}
</script>

<style>
.container {
	min-height: 100vh;
	background-color: #f8f8f8;
	padding: 20rpx;
}

.form-section {
	background-color: #ffffff;
	border-radius: 20rpx;
	padding: 20rpx;
	margin-bottom: 40rpx;
}

.avatar-upload {
	padding: 20rpx 0;
	border-bottom: 1rpx solid #f5f5f5;
}

.upload-title {
	font-size: 30rpx;
	color: #333;
	margin-bottom: 20rpx;
}

.upload-content {
	display: flex;
	align-items: center;
}

.preview-avatar {
	width: 120rpx;
	height: 120rpx;
	border-radius: 60rpx;
	background-color: #f5f5f5;
}

.form-item {
	display: flex;
	align-items: center;
	padding: 30rpx 0;
	border-bottom: 1rpx solid #f5f5f5;
}

.form-label {
	width: 120rpx;
	font-size: 30rpx;
	color: #333;
}

.form-input {
	flex: 1;
	font-size: 30rpx;
	color: #333;
}

.save-btn {
	background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
	color: #ffffff;
	font-size: 32rpx;
	text-align: center;
	padding: 20rpx;
	border-radius: 40rpx;
	margin: 40rpx 20rpx;
}
</style> 