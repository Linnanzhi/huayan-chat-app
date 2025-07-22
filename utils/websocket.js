// WebSocket工具类
class WebSocketUtil {
	constructor() {
		this.ws = null;
		this.url = 'ws://localhost:8561'; // WebSocket服务器地址
		this.isConnected = false;
		this.reconnectTimer = null;
		this.reconnectCount = 0;
		this.maxReconnectCount = 5;
		this.reconnectInterval = 3000; // 重连间隔3秒
		this.messageHandlers = new Map();
		this.messageQueue = []; // 消息队列
		this.connectPromise = null; // 连接Promise
		this.connecting = false; // 是否正在连接
		this.heartbeatTimer = null; // 心跳定时器
		this.lastHeartbeatTime = 0; // 上次心跳时间
		this.heartbeatInterval = 30000; // 心跳间隔30秒
		this.heartbeatTimeout = 10000; // 心跳超时时间10秒
		this.autoReconnect = true; // 是否自动重连
		this.eventListeners = {};
		this.connectionStatus = 'disconnected'; // 连接状态

		// 初始化默认的消息处理器
		this.initDefaultHandlers();
	}

	// 初始化默认的消息处理器
	initDefaultHandlers() {
		// 处理PING消息
		this.on('PING', (data) => {
			console.log('收到PING消息，发送PONG响应');
			this.send({
				biztype: 'PONG',
				DATA: 'PONG'
			});
		});

		// 处理PONG消息
		this.on('PONG', (data) => {
			console.log('收到PONG消息');
			this.lastHeartbeatTime = Date.now();
		});

		// 处理心跳消息
		this.on('heartbeat', (data) => {
			console.log('收到心跳消息');
			this.lastHeartbeatTime = Date.now();
			// 响应心跳
			this.send({
				biztype: 'heartbeat',
				timestamp: Date.now()
			});
		});
	}

	// 初始化WebSocket连接
	async init() {
		console.log('正在初始化WebSocket连接，URL:', this.url);
		if (this.connectionStatus === 'connecting') {
			console.log('WebSocket正在连接中，等待现有连接完成');
			return this.connectPromise;
		}
		
		if (this.connectionStatus === 'connected') {
			console.log('WebSocket已经连接');
			return Promise.resolve();
		}
		
		this.connectionStatus = 'connecting';
		return this.connect();
	}

	// 获取连接状态
	getConnectionStatus() {
		return this.connectionStatus;
	}

	// 建立连接
	connect() {
		if (this.connectPromise && this.connecting) {
			console.log('WebSocket正在连接中，等待现有连接完成');
			return this.connectPromise;
		}

		if (!this.url) {
			console.error('WebSocket URL未定义，无法建立连接');
			this.connectionStatus = 'error';
			return Promise.reject(new Error('WebSocket URL未定义'));
		}

		this.connecting = true;
		this.connectPromise = new Promise((resolve, reject) => {
			try {
				if (this.ws) {
					console.log('关闭现有WebSocket连接');
					this.ws.close();
				}

				console.log('创建新的WebSocket连接');
				this.ws = new WebSocket(this.url);

				// 设置超时
				const timeout = setTimeout(() => {
					if (!this.isConnected) {
						console.error('WebSocket连接超时');
						this.ws.close();
						this.connectionStatus = 'error';
						reject(new Error('连接超时'));
					}
				}, 5000);

				// 连接成功
				this.ws.onopen = () => {
					clearTimeout(timeout);
					console.log('WebSocket连接成功');
					this.isConnected = true;
					this.connecting = false;
					this.reconnectCount = 0;
					this.lastHeartbeatTime = Date.now();
					this.connectionStatus = 'connected';
					// 发送心跳包
					this.startHeartbeat();
					// 发送队列中的消息
					this.flushMessageQueue();
					resolve();
				};

				// 接收消息
				this.ws.onmessage = (event) => {
					try {
						const data = JSON.parse(event.data);
						console.log('收到WebSocket消息:', data);

						// 处理心跳响应
						if (data.biztype === 'heartbeat') {
							this.lastHeartbeatTime = Date.now();
							return;
						}

						this.handleMessage(data);
					} catch (e) {
						console.error('消息解析错误:', e);
					}
				};

				// 连接关闭
				this.ws.onclose = (event) => {
					clearTimeout(timeout);
					console.log('WebSocket连接关闭，代码:', event.code, '原因:', event.reason);
					this.isConnected = false;
					this.connecting = false;
					this.stopHeartbeat();
					this.connectionStatus = 'disconnected';

					// 根据错误码判断是否需要重连
					if (this.autoReconnect && (event.code === 1006 || event.code === 1000)) {
						console.error('WebSocket异常关闭，尝试重连');
						this.reconnect();
					}

					reject(new Error(`WebSocket连接关闭: ${event.reason || '未知原因'}`));
				};

				// 连接错误
				this.ws.onerror = (error) => {
					clearTimeout(timeout);
					console.error('WebSocket错误:', error);
					this.isConnected = false;
					this.connecting = false;
					this.connectionStatus = 'error';
					reject(new Error('WebSocket连接错误'));
				};
			} catch (error) {
				console.error('WebSocket连接异常:', error);
				this.connecting = false;
				this.connectionStatus = 'error';
				reject(new Error(`WebSocket连接异常: ${error.message}`));
			}
		});

		return this.connectPromise;
	}

	// 重连机制
	reconnect() {
		if (this.reconnectCount >= this.maxReconnectCount) {
			console.log('达到最大重连次数，停止重连');
			return;
		}

		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
		}

		this.reconnectTimer = setTimeout(() => {
			console.log(`尝试第${this.reconnectCount + 1}次重连...`);
			this.reconnectCount++;
			this.connectPromise = null;
			this.connect().catch(error => {
				console.error('重连失败:', error);
			});
		}, this.reconnectInterval);
	}

	// 发送消息
	async send(data) {
		if (!this.isConnected) {
			this.messageQueue.push(data);
			console.log('WebSocket未连接，消息已加入队列');

			// 如果不在连接中且不在重连中，尝试连接
			if (!this.connecting && !this.reconnectTimer) {
				try {
					if (!this.url) {
						console.error('WebSocket URL未定义，无法发送消息');
						return false;
					}
					await this.connect();
				} catch (error) {
					console.error('连接失败:', error);
					return false;
				}
			}
			return true;
		}

		try {
			const message = typeof data === 'string' ? data : JSON.stringify(data);
			this.ws.send(message);
			return true;
		} catch (error) {
			console.error('发送消息失败:', error);
			return false;
		}
	}

	// 处理消息
	handleMessage(data) {
		try {
			console.log('处理WebSocket消息:', data);
			
			// 获取消息类型（支持多种属性名和大小写）
			const type = (data.biztype || data.type || data.BIZTYPE || '').toUpperCase();
			
			// 如果是上传响应，直接触发upload事件
			if (data.requestId) {
				const listeners = this.eventListeners['upload'] || [];
				listeners.forEach(listener => {
					try {
						listener(data);
					} catch (error) {
						console.error('事件监听器执行错误:', error);
					}
				});
				return;
			}
			
			if (!type) {
				console.warn('未知的消息类型:', data);
				return;
			}
			
			// 检查是否有对应的消息处理器（大小写不敏感）
			const handler = this.messageHandlers.get(type);
			if (handler) {
				console.log('调用消息处理器:', type);
				try {
					handler(data);
				} catch (error) {
					console.error('消息处理器执行错误:', error);
				}
			} else {
				console.warn('未找到消息处理器:', type);
			}
			
			// 触发事件监听器（大小写不敏感）
			if (this.eventListeners[type]) {
				this.eventListeners[type].forEach(listener => {
					try {
						listener(data);
					} catch (error) {
						console.error('事件监听器执行错误:', error);
					}
				});
			}
		} catch (error) {
			console.error('消息处理错误:', error);
		}
	}

	// 注册消息处理器
	on(type, handler) {
		if (typeof handler !== 'function') {
			console.error('消息处理器必须是函数');
			return;
		}
		// 统一转换为大写存储
		this.messageHandlers.set(type.toUpperCase(), handler);
	}

	// 移除消息处理器
	off(type) {
		// 统一转换为大写
		this.messageHandlers.delete(type.toUpperCase());
	}

	// 开始心跳
	startHeartbeat() {
		if (this.heartbeatTimer) {
			clearInterval(this.heartbeatTimer);
		}

		this.heartbeatTimer = setInterval(() => {
			if (this.isConnected) {
				const now = Date.now();
				if (now - this.lastHeartbeatTime > this.heartbeatTimeout) {
					console.error('心跳超时，断开连接');
					this.ws.close();
					return;
				}

				this.send({
					biztype: 'heartbeat',
					timestamp: now
				});
			}
		}, this.heartbeatInterval);
	}

	// 停止心跳
	stopHeartbeat() {
		if (this.heartbeatTimer) {
			clearInterval(this.heartbeatTimer);
			this.heartbeatTimer = null;
		}
	}

	// 发送队列中的消息
	flushMessageQueue() {
		while (this.messageQueue.length > 0) {
			const data = this.messageQueue.shift();
			this.send(data).catch(error => {
				console.error('发送队列消息失败:', error);
			});
		}
	}

	// 关闭连接
	close() {
		this.autoReconnect = false; // 禁用自动重连
		this.stopHeartbeat();
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
		this.isConnected = false;
		this.connecting = false;
		this.messageQueue = []; // 清空消息队列
	}

	async uploadFile(filePath) {
		try {
			// 读取文件并转换为base64
			const base64 = await uni.getFileSystemManager().readFileSync(filePath, 'base64');
			
			// 生成请求ID
			const requestId = Date.now().toString();
			
			// 发送上传请求
			const success = await this.send({
				biztype: 'upload',
				data: {
					file: base64,
					type: 'image',
					requestId: requestId
				}
			});
			
			if (!success) {
				throw new Error('发送上传请求失败');
			}
			
			// 等待上传响应
			return new Promise((resolve, reject) => {
				const timeout = setTimeout(() => {
					this.off('upload', handler);
					reject(new Error('上传超时'));
				}, 10000);
				
				const handler = (data) => {
					if (data.requestId === requestId) {
						clearTimeout(timeout);
						this.off('upload', handler);
						if (data.code === 0) {
							resolve(data.data.url);
						} else {
							reject(new Error(data.msg || '上传失败'));
						}
					}
				};
				
				this.on('upload', handler);
			});
		} catch (error) {
			console.error('文件上传失败:', error);
			throw error;
		}
	}

	// 发送图片
	async sendImage(file, targetUserId) {
		try {
			// 上传图片到服务器
			const uploadRes = await uni.uploadFile({
				url: 'http://localhost:8562/upload', // 替换为实际的服务器地址
				filePath: file.path,
				name: 'file',
				formData: {
					type: 'image'
				}
			})
			
			console.log('上传响应:', uploadRes)
			
			if (uploadRes.statusCode === 200) {
				let fileInfo
				try {
					fileInfo = JSON.parse(uploadRes.data)
					// 如果响应是JSON格式，提取URL
					if (fileInfo.data && fileInfo.data.url) {
						fileInfo.url = fileInfo.data.url
					}
				} catch (e) {
					// 如果响应不是JSON格式，直接使用响应数据作为URL
					fileInfo = {
						url: uploadRes.data
					}
				}
				
				// 发送图片消息
				const message = {
					biztype: 'sendMessage',
					token: uni.getStorageSync('token'),
					to_userid: targetUserId,
					content: fileInfo.url, // 使用提取的URL
					type: 'image',
					fileInfo: {
						name: file.name,
						size: file.size,
						type: file.type
					}
				}
				
				console.log('发送图片消息:', message)
				return await this.send(message)
			} else {
				throw new Error('上传图片失败')
			}
		} catch (error) {
			console.error('发送图片失败:', error)
			throw error
		}
	}

	// 发送文件
	async sendFile(file, targetUserId) {
		const maxRetries = 3
		let retryCount = 0
		
		while (retryCount < maxRetries) {
			try {
				console.log(`开始上传文件 (尝试 ${retryCount + 1}/${maxRetries}):`, file)
				
				// 上传文件到服务器
				const uploadRes = await uni.uploadFile({
					url: 'http://localhost:8562/upload',
					filePath: file.path,
					name: 'file',
					formData: {
						type: 'file'
					},
					timeout: 30000 // 设置超时时间为30秒
				})
				
				console.log('上传响应:', uploadRes)
				
				if (uploadRes.statusCode === 200) {
					let fileInfo
					try {
						fileInfo = JSON.parse(uploadRes.data)
						console.log('解析后的文件信息:', fileInfo)
						
						// 检查响应格式
						if (!fileInfo.data || !fileInfo.data.url) {
							throw new Error('服务器响应格式错误')
						}
						
						// 发送文件消息
						const message = {
							biztype: 'sendMessage',
							token: uni.getStorageSync('token'),
							to_userid: targetUserId,
							content: fileInfo.data.url,
							type: 'file',
							fileInfo: {
								name: file.name,
								size: file.size,
								type: file.type
							}
						}
						
						console.log('发送文件消息:', message)
						return await this.send(message)
					} catch (parseError) {
						console.error('解析上传响应失败:', parseError)
						throw new Error('解析服务器响应失败')
					}
				} else {
					console.error('上传失败，状态码:', uploadRes.statusCode)
					if (uploadRes.statusCode === 413) {
						throw new Error('文件太大，请压缩后重试')
					} else if (uploadRes.statusCode === 415) {
						throw new Error('不支持的文件类型')
					} else {
						throw new Error(`上传失败，状态码: ${uploadRes.statusCode}`)
					}
				}
			} catch (error) {
				console.error(`发送文件失败 (尝试 ${retryCount + 1}/${maxRetries}):`, error)
				retryCount++
				
				if (retryCount === maxRetries) {
					throw error
				}
				
				// 等待一段时间后重试
				await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
			}
		}
	}
}

// 创建单例
const wsUtil = new WebSocketUtil();
export default wsUtil;