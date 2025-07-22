<template>
	<view class="container">
		<!-- 背景装饰 -->
		<view class="bg-decoration"></view>
		
		<!-- 顶部LOGO -->
		<view class="header">
			<image src="/static/logo.png" mode="aspectFit" class="logo-image"></image>
			<text class="app-name">花颜</text>
		</view>
		
		<!-- 标签页切换 -->
		<view class="tabs">
			<view 
				class="tab" 
				:class="{ active: activeTab === 'login' }" 
				@click="switchTab('login')"
			>登录</view>
			<view 
				class="tab" 
				:class="{ active: activeTab === 'register' }" 
				@click="switchTab('register')"
			>注册</view>
			<view class="tab-slider" :style="tabSliderStyle"></view>
		</view>
		
		<!-- 登录表单 -->
		<view class="form-container" v-if="activeTab === 'login'">
			<view class="form-item">
				<text class="form-icon">👤</text>
				<input 
					type="text" 
					v-model="loginForm.username" 
					placeholder="请输入用户名（字母或数字）" 
					placeholder-class="placeholder"
					class="form-input"
					@input="validateUsername(loginForm.username, 'login')"
				/>
			</view>
			<text class="input-tip" v-if="loginForm.usernameError">{{loginForm.usernameError}}</text>
			
			<view class="form-item">
				<text class="form-icon">🔒</text>
				<input 
					:type="showLoginPassword ? 'text' : 'password'" 
					v-model="loginForm.password" 
					placeholder="请输入密码" 
					placeholder-class="placeholder"
					class="form-input"
				/>
				<text 
					class="password-toggle" 
					@click="showLoginPassword = !showLoginPassword"
				>{{showLoginPassword ? '👁️' : '👁️‍🗨️'}}</text>
			</view>
			
			<button class="submit-btn" hover-class="btn-hover" @click="handleLogin" :disabled="!isLoginFormValid">登录</button>
			
			<view class="form-footer">
				<text class="form-tips">登录即表示同意《用户协议》和《隐私政策》</text>
			</view>
		</view>
		
		<!-- 注册表单 -->
		<view class="form-container" v-if="activeTab === 'register'">
			<view class="form-item">
				<text class="form-icon">👤</text>
				<input 
					type="text" 
					v-model="registerForm.username" 
					placeholder="请设置用户名（字母或数字）" 
					placeholder-class="placeholder"
					class="form-input"
					@input="validateUsername(registerForm.username, 'register')"
				/>
			</view>
			<text class="input-tip" v-if="registerForm.usernameError">{{registerForm.usernameError}}</text>
			
			<view class="form-item">
				<text class="form-icon">👤</text>
				<input 
					type="text" 
					v-model="registerForm.nickname" 
					placeholder="请设置昵称" 
					placeholder-class="placeholder"
					class="form-input"
				/>
			</view>
			
			<view class="form-item">
				<text class="form-icon">🔒</text>
				<input 
					:type="showRegisterPassword ? 'text' : 'password'" 
					v-model="registerForm.password" 
					placeholder="请设置密码" 
					placeholder-class="placeholder"
					class="form-input"
				/>
				<text 
					class="password-toggle" 
					@click="showRegisterPassword = !showRegisterPassword"
				>{{showRegisterPassword ? '👁️' : '👁️‍🗨️'}}</text>
			</view>
			<text class="password-tip">密码需包含大小写字母</text>
			
			<view class="form-item">
				<text class="form-icon">🔒</text>
				<input 
					:type="showConfirmPassword ? 'text' : 'password'" 
					v-model="registerForm.confirmPassword" 
					placeholder="请确认密码" 
					placeholder-class="placeholder"
					class="form-input"
				/>
				<text 
					class="password-toggle" 
					@click="showConfirmPassword = !showConfirmPassword"
				>{{showConfirmPassword ? '👁️' : '👁️‍🗨️'}}</text>
			</view>
			
			<button class="submit-btn" hover-class="btn-hover" @click="handleRegister" :disabled="!isRegisterFormValid">注册</button>
			
			<view class="form-footer">
				<text class="form-tips">注册即表示同意《用户协议》和《隐私政策》</text>
			</view>
		</view>
	</view>
</template>

<script>
import wsUtil from '../../utils/websocket.js'

export default {
	data() {
		return {
			activeTab: 'login',
			showLoginPassword: false,
			showRegisterPassword: false,
			showConfirmPassword: false,
			loginForm: {
				username: '',
				password: '',
				usernameError: ''
			},
			registerForm: {
				username: '',
				nickname: '',
				password: '',
				confirmPassword: '',
				usernameError: ''
			}
		}
	},
	computed: {
		tabSliderStyle() {
			return {
				transform: this.activeTab === 'login' ? 'translateX(0)' : 'translateX(100%)'
			}
		},
		isLoginFormValid() {
			return this.loginForm.username && 
				   this.loginForm.password && 
				   !this.loginForm.usernameError;
		},
		isRegisterFormValid() {
			return this.registerForm.username && 
				   this.registerForm.nickname && 
				   this.registerForm.password && 
				   this.registerForm.confirmPassword && 
				   !this.registerForm.usernameError;
		}
	},
	onLoad() {
		// 检查用户是否已登录
		this.checkLoginStatus();
	},
	methods: {
		// 切换标签页
		switchTab(tab) {
			this.activeTab = tab;
		},
		
		// 检查登录状态
		checkLoginStatus() {
			try {
				const token = uni.getStorageSync('token');
				const userInfoStr = uni.getStorageSync('userInfo');
				
				if (!token || !userInfoStr) {
					console.log('未找到登录信息');
					return;
				}
				
				// 解析用户信息
				const userInfo = JSON.parse(userInfoStr);
				
				// 验证token和用户信息是否匹配
				if (userInfo.token !== token) {
					console.error('token不匹配，清除登录信息');
					this.clearLoginInfo();
					return;
				}
				
				// 验证登录是否过期（24小时）
				const now = new Date().getTime();
				if (now - userInfo.loginTime > 24 * 60 * 60 * 1000) {
					console.log('登录已过期，清除登录信息');
					this.clearLoginInfo();
					return;
				}
				
				// 验证token
				this.verifyToken(token);
			} catch (error) {
				console.error('检查登录状态失败:', error);
				this.clearLoginInfo();
			}
		},
		
		// 清除登录信息
		clearLoginInfo() {
			try {
				uni.removeStorageSync('token');
				uni.removeStorageSync('userInfo');
				console.log('登录信息已清除');
			} catch (error) {
				console.error('清除登录信息失败:', error);
			}
		},
		
		// 验证token
		verifyToken(token) {
			// 确保WebSocket已连接
			if (!wsUtil.isConnected) {
				console.log('WebSocket未连接，尝试连接');
				wsUtil.init('ws://localhost:8561').then(() => {
					// 连接成功后发送验证请求
					this.sendVerifyRequest(token);
				}).catch(error => {
					console.error('WebSocket连接失败:', error);
					this.clearLoginInfo();
				});
			} else {
				// 已连接，直接发送验证请求
				this.sendVerifyRequest(token);
			}
		},
		
		// 发送验证请求
		sendVerifyRequest(token) {
			// 创建一个Promise来处理验证响应
			const verifyPromise = new Promise((resolve, reject) => {
				// 设置超时
				const timeout = setTimeout(() => {
					wsUtil.off('verifyToken', verifyHandler);
					reject(new Error('验证超时'));
				}, 5000);
				
				// 处理验证响应
				const verifyHandler = (data) => {
					console.log('收到验证响应:', data);
					clearTimeout(timeout);
					wsUtil.off('verifyToken', verifyHandler);
					
					if (data.success) {
						console.log('token验证成功');
						resolve(true);
					} else {
						console.error('token验证失败:', data.message);
						reject(new Error(data.message || 'token验证失败'));
					}
				};
				
				// 注册消息处理器
				wsUtil.on('verifyToken', verifyHandler);
			});
			
			// 发送验证请求
			wsUtil.send({
				biztype: 'verifyToken',
				token: token
			}).then(success => {
				if (!success) {
					console.error('发送验证请求失败');
					this.clearLoginInfo();
				}
			}).catch(error => {
				console.error('验证token失败:', error);
				this.clearLoginInfo();
			});
			
			// 处理验证结果
			verifyPromise.then(() => {
				console.log('token验证成功，跳转到首页');
				uni.reLaunch({
					url: '/pages/chat/chat'
				});
			}).catch(error => {
				console.error('token验证失败:', error);
				this.clearLoginInfo();
			});
		},
		
		// 验证用户名格式
		validateUsername(username, formType) {
			const usernameRegex = /^[a-zA-Z0-9]+$/;
			const errorMessage = '用户名只能包含字母和数字';
			
			if (formType === 'login') {
				this.loginForm.usernameError = username && !usernameRegex.test(username) ? errorMessage : '';
			} else {
				this.registerForm.usernameError = username && !usernameRegex.test(username) ? errorMessage : '';
			}
		},
		
		// 处理登录
		async handleLogin() {
			if (!this.loginForm.username || !this.loginForm.password) {
				uni.showToast({
					title: '请输入用户名和密码',
					icon: 'none'
				});
				return;
			}

			uni.showLoading({
				title: '登录中...'
			});

			try {
				// 确保WebSocket已连接
				if (!wsUtil.isConnected) {
					console.log('WebSocket未连接，尝试连接');
					try {
						await wsUtil.init('ws://localhost:8561');
						console.log('WebSocket连接成功');
					} catch (error) {
						console.error('WebSocket连接失败:', error);
						throw new Error('WebSocket连接失败，请检查网络连接');
					}
				}
				
				// 创建一个Promise来处理登录响应
				const loginPromise = new Promise((resolve, reject) => {
					// 设置超时
					const timeout = setTimeout(() => {
						wsUtil.off('userLogin', loginHandler);
						reject(new Error('登录超时'));
					}, 10000);
					
					// 处理登录响应
					const loginHandler = (data) => {
						console.log('收到登录响应，完整数据:', JSON.stringify(data, null, 2));
						clearTimeout(timeout);
						wsUtil.off('userLogin', loginHandler);
						
						// 检查响应中是否包含成功标志
						if (data.code === 200 || data.success === true || data.message === "登录成功") {
							console.log('登录成功，服务器返回数据:', {
								success: data.success,
								message: data.message,
								userid: data.userid,
								token: data.token ? '存在' : '不存在',
								data: data.data ? '存在' : '不存在'
							});
							
							// 尝试从不同位置获取token
							let token = null;
							if (data.token) {
								token = data.token;
							} else if (data.data?.token) {
								token = data.data.token;
							} else if (data.data?.userInfo?.token) {
								token = data.data.userInfo.token;
							} else if (typeof data.data === 'string') {
								try {
									const parsedData = JSON.parse(data.data);
									token = parsedData.token || parsedData.userInfo?.token;
								} catch (e) {
									console.warn('解析data.data字符串失败:', e);
								}
							}
							
							if (!token) {
								console.error('无法从响应中获取token，完整响应:', data);
								reject(new Error('服务器返回数据不完整：缺少token'));
								return;
							}
							
							// 登录成功，保存用户信息和token
							const userInfo = {
								username: this.loginForm.username,
								userid: data.userid || data.data?.userid || this.loginForm.username,
								nickname: data.data?.userInfo?.nickname || '',
								token: token,
								avatar: data.data?.userInfo?.avatar || '',
								loginTime: new Date().getTime()
							};
							
							try {
								console.log('准备保存用户信息:', userInfo);
								
								// 检查数据完整性
								if (!userInfo.username) {
									throw new Error('用户名不能为空');
								}
								if (!userInfo.token) {
									throw new Error('token不能为空');
								}
								if (!userInfo.userid) {
									throw new Error('用户ID不能为空');
								}
								
								// 先尝试清除旧数据
								try {
									uni.removeStorageSync('userInfo');
									uni.removeStorageSync('token');
									console.log('已清除旧数据');
								} catch (clearError) {
									console.warn('清除旧数据失败:', clearError);
								}
								
								// 保存用户信息
								const userInfoStr = JSON.stringify(userInfo);
								console.log('序列化后的用户信息:', userInfoStr);
								
								// 保存用户信息
								uni.setStorageSync('userInfo', userInfoStr);
								console.log('用户信息已保存');
								
								// 保存token
								uni.setStorageSync('token', userInfo.token);
								console.log('token已保存');
								
								// 验证存储是否成功
								const storedUserInfoStr = uni.getStorageSync('userInfo');
								const storedToken = uni.getStorageSync('token');
								
								if (!storedUserInfoStr) {
									throw new Error('用户信息存储失败');
								}
								
								if (!storedToken) {
									throw new Error('token存储失败');
								}
								
								// 验证数据完整性
								const parsedUserInfo = JSON.parse(storedUserInfoStr);
								if (!parsedUserInfo.username || !parsedUserInfo.token) {
									throw new Error('存储的数据不完整');
								}
								
								console.log('登录成功，用户信息已保存并验证:', parsedUserInfo);
								resolve(true);
							} catch (error) {
								console.error('保存用户信息失败:', error);
								// 尝试恢复存储
								try {
									uni.removeStorageSync('userInfo');
									uni.removeStorageSync('token');
									console.log('已清除可能损坏的数据');
								} catch (clearError) {
									console.error('清除损坏数据失败:', clearError);
								}
								reject(new Error('保存用户信息失败: ' + error.message));
							}
						} else {
							reject(new Error(data.message || '登录失败'));
						}
					};
					
					// 注册消息处理器
					wsUtil.on('userLogin', loginHandler);
				});
				
				// 发送登录请求
				console.log('发送登录请求');
				const success = await wsUtil.send({
					biztype: 'userLogin',
					userid: this.loginForm.username,
					userpwd: this.loginForm.password
				});

				if (!success) {
					throw new Error('发送登录请求失败');
				}
				
				// 等待登录响应
				await loginPromise;
				
				// 登录成功，跳转到首页
				uni.hideLoading();
				uni.showToast({
					title: '登录成功',
					icon: 'success'
				});
				
				// 延迟跳转，让用户看到成功提示
				setTimeout(() => {
					uni.reLaunch({
						url: '/pages/chat/chat'
					});
				}, 1500);
				
			} catch (error) {
				console.error('登录失败:', error);
				uni.hideLoading();
				uni.showToast({
					title: error.message || '登录失败，请重试',
					icon: 'none'
				});
			}
		},
		
		// 处理注册
		async handleRegister() {
			if (!this.registerForm.username || !this.registerForm.password || !this.registerForm.confirmPassword) {
				uni.showToast({
					title: '请填写完整信息',
					icon: 'none'
				});
				return;
			}

			if (this.registerForm.password !== this.registerForm.confirmPassword) {
				uni.showToast({
					title: '两次输入的密码不一致',
					icon: 'none'
				});
				return;
			}

			uni.showLoading({
				title: '注册中...'
			});

			try {
				// 确保WebSocket已连接
				if (!wsUtil.isConnected) {
					console.log('WebSocket未连接，尝试连接');
					await wsUtil.init('ws://localhost:8561');
				}
				
				// 创建一个Promise来处理注册响应
				const registerPromise = new Promise((resolve, reject) => {
					// 设置超时
					const timeout = setTimeout(() => {
						wsUtil.off('userReg', registerHandler);
						reject(new Error('注册超时'));
					}, 10000);
					
					// 处理注册响应
					const registerHandler = (data) => {
						console.log('收到注册响应，完整数据:', JSON.stringify(data, null, 2));
						clearTimeout(timeout);
						wsUtil.off('userReg', registerHandler);
						
						// 修改判断逻辑：检查消息内容或success标志
						if (data.success === true || data.message === "注册成功") {
							console.log('注册成功，服务器返回数据:', {
								success: data.success,
								message: data.message,
								userid: data.userid,
								token: data.token ? '存在' : '不存在',
								data: data.data ? '存在' : '不存在',
								fullData: data
							});
							
							// 尝试从不同位置获取token
							let token = null;
							if (data.token) {
								token = data.token;
							} else if (data.data?.token) {
								token = data.data.token;
							} else if (data.data?.userInfo?.token) {
								token = data.data.userInfo.token;
							} else if (typeof data.data === 'string') {
								try {
									const parsedData = JSON.parse(data.data);
									token = parsedData.token || parsedData.userInfo?.token;
								} catch (e) {
									console.warn('解析data.data字符串失败:', e);
								}
							}
							
							if (!token) {
								console.error('无法从响应中获取token，完整响应:', data);
								reject(new Error('服务器返回数据不完整：缺少token'));
								return;
							}
							
							// 注册成功，保存用户信息和token
							const userInfo = {
								username: this.registerForm.username,
								userid: data.userid || data.data?.userid || this.registerForm.username,
								nickname: data.data?.userInfo?.nickname || this.registerForm.nickname,
								token: token,
								avatar: data.data?.userInfo?.avatar || 'http://localhost:8562/default-avatar.png',
								loginTime: new Date().getTime()
							};
							
							try {
								console.log('准备保存用户信息:', userInfo);
								
								// 检查数据完整性
								if (!userInfo.username) {
									throw new Error('用户名不能为空');
								}
								if (!userInfo.token) {
									throw new Error('token不能为空');
								}
								if (!userInfo.userid) {
									throw new Error('用户ID不能为空');
								}
								
								// 先尝试清除旧数据
								try {
									uni.removeStorageSync('userInfo');
									uni.removeStorageSync('token');
									console.log('已清除旧数据');
								} catch (clearError) {
									console.warn('清除旧数据失败:', clearError);
								}
								
								// 保存用户信息
								const userInfoStr = JSON.stringify(userInfo);
								console.log('序列化后的用户信息:', userInfoStr);
								
								// 保存用户信息
								uni.setStorageSync('userInfo', userInfoStr);
								console.log('用户信息已保存');
								
								// 保存token
								uni.setStorageSync('token', userInfo.token);
								console.log('token已保存');
								
								// 验证存储是否成功
								const storedUserInfoStr = uni.getStorageSync('userInfo');
								const storedToken = uni.getStorageSync('token');
								
								if (!storedUserInfoStr) {
									throw new Error('用户信息存储失败');
								}
								
								if (!storedToken) {
									throw new Error('token存储失败');
								}
								
								// 验证数据完整性
								const parsedUserInfo = JSON.parse(storedUserInfoStr);
								if (!parsedUserInfo.username || !parsedUserInfo.token) {
									throw new Error('存储的数据不完整');
								}
								
								console.log('注册成功，用户信息已保存并验证:', parsedUserInfo);
								resolve(true);
							} catch (error) {
								console.error('保存用户信息失败:', error);
								// 尝试恢复存储
								try {
									uni.removeStorageSync('userInfo');
									uni.removeStorageSync('token');
									console.log('已清除可能损坏的数据');
								} catch (clearError) {
									console.error('清除损坏数据失败:', clearError);
								}
								reject(new Error('保存用户信息失败: ' + error.message));
							}
						} else {
							reject(new Error(data.message || '注册失败'));
						}
					};
					
					// 注册消息处理器
					wsUtil.on('userReg', registerHandler);
				});
				
				// 发送注册请求
				console.log('开始发送注册请求...');
				const success = await wsUtil.send({
					biztype: 'userReg',
					userid: this.registerForm.username,
					userpwd: this.registerForm.password,
					nickname: this.registerForm.nickname
				});

				if (!success) {
					console.error('WebSocket发送注册请求失败');
					throw new Error('发送注册请求失败');
				}
				
				console.log('注册请求已发送，等待响应...');
				// 等待注册响应
				await registerPromise;
				
				// 注册成功，跳转到首页
				console.log('注册流程完成，准备跳转...');
				uni.hideLoading();
				uni.showToast({
					title: '注册成功',
					icon: 'success'
				});
				
				// 延迟跳转，让用户看到成功提示
				setTimeout(() => {
					uni.reLaunch({
						url: '/pages/chat/chat'
					});
				}, 1500);
				
			} catch (error) {
				console.error('注册失败，详细错误:', error);
				console.error('错误堆栈:', error.stack);
				uni.hideLoading();
				
				// 优化错误提示
				let errorMessage = error.message || '注册失败，请重试';
				if (errorMessage.includes('用户名已存在')) {
					errorMessage = '该用户名已被注册，请更换用户名';
				} else if (errorMessage.includes('密码')) {
					errorMessage = '密码格式不正确，请确保包含大小写字母';
				}
				
				uni.showToast({
					title: errorMessage,
					icon: 'none',
					duration: 2000
				});
			}
		}
	}
}
</script>

<style>
.container {
	position: relative;
	height: 100vh;
	box-sizing: border-box;
	padding: 60rpx 50rpx;
	background: linear-gradient(to bottom, #4facfe, #ffffff);
	overflow: hidden;
}

.bg-decoration {
	position: absolute;
	top: -150rpx;
	right: -150rpx;
	width: 500rpx;
	height: 500rpx;
	border-radius: 50%;
	background: linear-gradient(45deg, #00c6fb, #005bea);
	opacity: 0.2;
	z-index: -1;
}

.bg-decoration::after {
	content: '';
	position: absolute;
	left: -250rpx;
	bottom: -250rpx;
	width: 400rpx;
	height: 400rpx;
	border-radius: 50%;
	background: linear-gradient(45deg, #00c6fb, #005bea);
	opacity: 0.2;
}

.header {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-bottom: 60rpx;
}

.logo-image {
	width: 160rpx;
	height: 160rpx;
}

.app-name {
	margin-top: 20rpx;
	font-size: 36rpx;
	font-weight: 600;
	color: #333;
}

.tabs {
	display: flex;
	position: relative;
	margin-bottom: 60rpx;
	border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.tab {
	flex: 1;
	height: 80rpx;
	line-height: 80rpx;
	text-align: center;
	font-size: 32rpx;
	font-weight: 500;
	color: #999;
	position: relative;
	transition: all 0.3s;
}

.tab.active {
	color: #4facfe;
}

.tab-slider {
	position: absolute;
	bottom: 0;
	left: 0;
	width: 50%;
	height: 4rpx;
	background-color: #4facfe;
	transition: transform 0.3s ease;
}

.form-container {
	padding: 20rpx 0;
}

.form-item {
	position: relative;
	display: flex;
	align-items: center;
	background-color: #f8f8f8;
	margin-bottom: 40rpx;
	border-radius: 50rpx;
	padding: 10rpx 30rpx;
	box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.form-icon {
	font-size: 40rpx;
	margin-right: 20rpx;
}

.form-input {
	flex: 1;
	height: 80rpx;
	font-size: 28rpx;
	color: #333;
}

.placeholder {
	color: #bbb;
}

.password-toggle {
	font-size: 40rpx;
	padding: 0 10rpx;
}

.password-tip {
	font-size: 24rpx;
	color: #999;
	margin-top: -20rpx;
	margin-bottom: 40rpx;
	padding-left: 30rpx;
}

.input-tip {
	font-size: 24rpx;
	color: #ff4d4f;
	margin-top: -20rpx;
	margin-bottom: 20rpx;
	padding-left: 30rpx;
}

.submit-btn {
	width: 100%;
	height: 90rpx;
	line-height: 90rpx;
	text-align: center;
	background: linear-gradient(45deg, #4facfe, #00f2fe);
	color: #fff;
	font-size: 32rpx;
	font-weight: 500;
	border-radius: 50rpx;
	box-shadow: 0 10rpx 20rpx rgba(79, 172, 254, 0.3);
	margin: 60rpx 0 40rpx;
	border: none;
	transition: all 0.3s;
}

.btn-hover {
	transform: translateY(3rpx);
	box-shadow: 0 5rpx 10rpx rgba(79, 172, 254, 0.3);
}

.submit-btn[disabled] {
	opacity: 0.6;
	background: #ccc;
	box-shadow: none;
}

.form-footer {
	text-align: center;
}

.form-tips {
	font-size: 24rpx;
	color: #999;
}
</style> 