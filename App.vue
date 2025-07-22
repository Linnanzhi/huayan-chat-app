<script>
	import wsUtil from './utils/websocket.js'

	export default {
		onLaunch: function() {
			console.log('App Launch');
			
			// 统一初始化WebSocket连接
			wsUtil.init().catch(error => {
				console.error('WebSocket初始化失败:', error);
			});
			
			// 注册消息处理器
			wsUtil.on('userLogin', (data) => {
				console.log('收到登录响应:', data);
				if (data.code === 200) {
					try {
						// 登录成功，保存用户信息
						console.log('登录成功，保存用户信息:', data.data);
						this.handleLoginSuccess(data.data);
					} catch (error) {
						console.error('处理登录响应时出错:', error);
						uni.showToast({
							title: '登录处理失败',
							icon: 'none'
						});
					}
				} else {
					console.error('登录失败:', data.message);
					uni.showToast({
						title: data.message || '登录失败',
						icon: 'none'
					});
				}
			});
			
			wsUtil.on('userReg', (data) => {
				console.log('收到注册响应:', data);
				if (data.code === 200) {
					uni.showToast({
						title: '注册成功',
						icon: 'success'
					});
					// 切换到登录页
					this.activeTab = 'login';
					// 填充登录表单
					this.loginForm.username = this.registerForm.username;
					this.loginForm.password = this.registerForm.password;
				} else {
					uni.showToast({
						title: data.message,
						icon: 'none'
					});
				}
			});
			
			// 检查用户登录状态
			this.checkLoginStatus();
		},
		onShow: function() {
			console.log('App Show');
		},
		onHide: function() {
			console.log('App Hide');
		},
		methods: {
			// 检查登录状态的方法
			checkLoginStatus() {
				// 获取存储的token
				const token = uni.getStorageSync('token');
				
				// 获取当前页面路径
				const pages = getCurrentPages();
				const currentPage = pages.length > 0 ? pages[pages.length - 1].route : '';
				
				// 如果没有token且当前不在登录页，则跳转到登录页
				if (!token && currentPage !== 'pages/login/login') {
					uni.reLaunch({
						url: '/pages/login/login'
					});
				}
				// 如果有token且当前在登录页，则跳转到首页
				else if (token && currentPage === 'pages/login/login') {
					uni.reLaunch({
						url: '/pages/index/index'
					});
				}
			},
			
			// 处理登录成功
			handleLoginSuccess(data) {
				try {
					// 确保data中包含必要的用户信息
					if (!data || !data.userInfo) {
						throw new Error('登录响应数据格式错误');
					}
					
					const userInfo = {
						username: data.userInfo.username,
						userid: data.userInfo.userid,
						nickname: data.userInfo.nickname,
						token: data.userInfo.token,
						avatar: data.userInfo.avatar || 'http://localhost:8562/default-avatar.png',
						loginTime: new Date().getTime()
					};
					
					console.log('保存用户信息:', userInfo);
					
					// 保存用户信息
					uni.setStorageSync('userInfo', JSON.stringify(userInfo));
					uni.setStorageSync('token', userInfo.token);
					
					// 验证头像 URL
					if (userInfo.avatar) {
						// 如果头像 URL 是相对路径，转换为完整 URL
						if (!userInfo.avatar.startsWith('http')) {
							userInfo.avatar = 'http://localhost:8562' + userInfo.avatar;
							// 更新存储的用户信息
							uni.setStorageSync('userInfo', JSON.stringify(userInfo));
						}
						
						// 预加载头像
						uni.getImageInfo({
							src: userInfo.avatar,
							success: () => {
								console.log('头像预加载成功');
							},
							fail: (err) => {
								console.error('头像预加载失败:', err);
								// 如果头像加载失败，使用默认头像
								userInfo.avatar = 'http://localhost:8562/default-avatar.png';
								uni.setStorageSync('userInfo', JSON.stringify(userInfo));
							}
						});
					}
					
					// 直接跳转到首页
					uni.reLaunch({
						url: '/pages/index/index'
					});
				} catch (error) {
					console.error('处理登录响应时出错:', error);
					uni.showToast({
						title: '登录处理失败',
						icon: 'none'
					});
				}
			}
		}
	}
</script>

<style>
	/*每个页面公共css */
</style>
