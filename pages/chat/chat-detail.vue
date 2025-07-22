<template>
  <view class="chat-detail">
    <!-- 聊天消息列表 -->
    <scroll-view 
      class="message-list" 
      scroll-y 
      :scroll-top="scrollTop"
      @scrolltoupper="loadMoreMessages"
    >
      <view class="loading" v-if="loading">加载中...</view>
      <view class="message-item" v-for="(msg, index) in messages" :key="index">
        <!-- 对方消息（左侧） -->
        <view class="message-content left" v-if="msg.from_userid === targetUser.userid">
          <image class="avatar" :src="msg.avatar || '/static/default-avatar.png'" mode="aspectFill"></image>
          <view class="message-bubble">
            <!-- 文本消息 -->
            <text class="message-text" v-if="msg.type === 'text'">{{msg.content}}</text>
            <!-- 图片消息 -->
            <image 
              v-else-if="msg.type === 'image'" 
              class="message-image" 
              :src="msg.content" 
              mode="widthFix"
              @tap="previewImage(msg.content)"
            ></image>
            <!-- 文件消息 -->
            <template v-else-if="msg.type === 'file'">
              <view class="file-message">
                <view class="file-info">
                  <text class="file-name">{{ msg.original_name || msg.content.split('/').pop() }}</text>
                  <text class="file-size">{{ formatFileSize(msg.fileInfo && msg.fileInfo.size || 0) }}</text>
                </view>
                <view class="file-action" @tap="downloadFile(msg)">
                  <text class="download-text">下载</text>
                </view>
              </view>
            </template>
            <text class="message-time">{{formatTime(msg.created_at)}}</text>
          </view>
        </view>
        <!-- 自己消息（右侧） -->
        <view class="message-content right" v-else>
          <view class="message-bubble">
            <!-- 文本消息 -->
            <text class="message-text" v-if="msg.type === 'text'">{{msg.content}}</text>
            <!-- 图片消息 -->
            <image 
              v-else-if="msg.type === 'image'" 
              class="message-image" 
              :src="msg.content" 
              mode="widthFix"
              @tap="previewImage(msg.content)"
            ></image>
            <!-- 文件消息 -->
            <template v-else-if="msg.type === 'file'">
              <view class="file-message">
                <view class="file-info">
                  <text class="file-name">{{ msg.original_name || msg.content.split('/').pop() }}</text>
                  <text class="file-size">{{ formatFileSize(msg.fileInfo && msg.fileInfo.size || 0) }}</text>
                </view>
                <view class="file-action" @tap="downloadFile(msg)">
                  <text class="download-text">下载</text>
                </view>
              </view>
            </template>
            <text class="message-time">{{formatTime(msg.created_at)}}</text>
          </view>
          <image class="avatar" :src="msg.avatar || '/static/default-avatar.png'" mode="aspectFill"></image>
        </view>
      </view>
    </scroll-view>

    <!-- 底部输入框 -->
    <view class="input-area" :class="{'panel-active': showMorePanel}">
      <input 
        class="message-input" 
        type="text" 
        v-model="messageContent" 
        placeholder="请输入消息"
        @confirm="sendMessage"
      />
      <view class="action-buttons">
        <view class="emoji-btn" @tap="toggleEmojiPicker">
          <text class="iconfont icon-emoji">😊</text>
        </view>
        <view class="plus-btn" @tap="toggleMorePanel" v-if="!messageContent.trim()">
          <text class="iconfont icon-plus">+</text>
        </view>
        <button class="send-btn" @tap="sendMessage" v-else>发送</button>
      </view>
    </view>

    <!-- 更多功能面板 -->
    <view class="more-panel" :class="{'show': showMorePanel}">
      <view class="panel-item" @tap="chooseImage">
        <view class="item-icon">
          <text class="iconfont icon-image">🖼️</text>
        </view>
        <text class="item-text">图片</text>
      </view>
      <view class="panel-item" @tap="chooseFile">
        <view class="item-icon">
          <text class="iconfont icon-file">📁</text>
        </view>
        <text class="item-text">文件</text>
      </view>
    </view>

    <!-- 表情选择器 -->
    <view class="emoji-picker" v-if="showEmojiPicker">
      <emoji-picker @select="onSelectEmoji" />
    </view>
  </view>
</template>

<script>
import { formatTime } from '@/utils/util'
import wsUtil from '@/utils/websocket.js'
import EmojiPicker from '@/components/emoji-picker/emoji-picker.vue'

export default {
  components: {
    EmojiPicker
  },
  data() {
    return {
      targetUser: {},
      messages: [],
      messageContent: '',
      scrollTop: 0,
      loading: false,
      hasMore: true,
      page: 1,
      pageSize: 20,
      userInfo: null,
      showEmojiPicker: false,
      showMorePanel: false
    }
  },
  onLoad(options) {
    if (options.userid) {
      // 保存完整的目标用户信息，包括头像
      this.targetUser = {
        userid: options.userid,
        nickname: options.nickname,
        avatar: options.avatar  // 确保传入目标用户的头像URL
      }
      // 设置页面标题
      uni.setNavigationBarTitle({
        title: this.targetUser.nickname || '未知用户'
      })
      this.initChat()
    }
  },
  onUnload() {
    this.cleanupWebSocket()
  },
  methods: {
    async initChat() {
      // 获取用户信息
      const userInfoStr = uni.getStorageSync('userInfo')
      if (!userInfoStr) {
        uni.showToast({
          title: '用户信息不存在',
          icon: 'none'
        })
        return
      }
      try {
        this.userInfo = JSON.parse(userInfoStr)
        console.log('解析后的用户信息:', this.userInfo)
      } catch (e) {
        console.error('解析用户信息失败:', e)
        uni.showToast({
          title: '用户信息格式错误',
          icon: 'none'
        })
        return
      }

      // 检查WebSocket连接状态
      if (!wsUtil.isConnected) {
        wsUtil.connect()
      }
      
      // 设置WebSocket监听
      this.setupWebSocket()
      
      // 加载消息
      await this.loadMessages()
    },
    setupWebSocket() {
      wsUtil.on('newMessage', this.handleNewMessage)
      wsUtil.on('getMessages', this.handleGetMessages)
      wsUtil.on('sendMessage', this.handleSendMessage)
    },
    cleanupWebSocket() {
      wsUtil.off('newMessage', this.handleNewMessage)
      wsUtil.off('getMessages', this.handleGetMessages)
      wsUtil.off('sendMessage', this.handleSendMessage)
    },
    handleNewMessage(message) {
      if (!this.userInfo) return // 确保userInfo存在
      
      if (message.from_userid === this.userInfo.userid || 
          message.to_userid === this.userInfo.userid) {
        // 处理文件消息
        if (message.type === 'file') {
          // 确保文件消息包含完整的文件信息
          if (!message.fileInfo) {
            message.fileInfo = {
              name: message.originalName || message.content.split('/').pop() || '未知文件',
              size: 0,
              type: 'application/octet-stream'
            }
          }
          // 确保文件路径是完整的URL
          if (message.content && !message.content.startsWith('http')) {
            message.content = 'http://localhost:8562' + (message.content[0] === '/' ? '' : '/') + message.content
          }
        }
        
        // 添加发送者标识
        const processedMessage = {
          ...message,
          avatar: message.from_userid === this.userInfo.userid ? 
            this.userInfo.avatar : 
            this.targetUser.avatar
        }
        
        // 新消息添加到列表末尾
        this.messages.push(processedMessage)
        this.scrollToBottom()
      }
    },
    handleGetMessages(data) {
      if (data.success && this.userInfo) {
        const newMessages = data.messages || []
        if (newMessages.length < this.pageSize) {
          this.hasMore = false
        }
        
        // 确保每条消息都有正确的头像和文件信息
        const processedMessages = newMessages.map(msg => {
          // 处理文件消息
          if (msg.type === 'file' && !msg.fileInfo) {
            msg.fileInfo = {
              name: msg.content.split('/').pop() || '未知文件',
              size: 0,
              type: 'application/octet-stream'
            }
          }
          
          return {
            ...msg,
            avatar: msg.from_userid === this.userInfo.userid ? 
              this.userInfo.avatar : 
              this.targetUser.avatar
          }
        })
        
        // 按时间正序排序（越早的消息越靠上）
        processedMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        
        if (this.page === 1) {
          this.messages = processedMessages
        } else {
          // 加载更多历史消息时，将新消息放在最前面
          this.messages = [...processedMessages, ...this.messages]
        }
        
        if (this.page === 1) {
          this.scrollToBottom()
        }
        
        this.page++
      }
      this.loading = false
    },
    handleSendMessage(data) {
      if (data.success) {
        if (!this.userInfo) {
          console.error('用户信息不存在')
          return
        }
        
        // 处理文件消息
        if (data.message.type === 'file') {
          // 确保文件消息包含完整的文件信息
          if (!data.message.fileInfo) {
            data.message.fileInfo = {
              name: data.message.originalName || data.message.content.split('/').pop() || '未知文件',
              size: 0,
              type: 'application/octet-stream'
            }
          }
          // 确保文件路径是完整的URL
          if (data.message.content && !data.message.content.startsWith('http')) {
            data.message.content = 'http://localhost:8562' + (data.message.content[0] === '/' ? '' : '/') + data.message.content
          }
        }
        
        // 发送成功，将消息添加到列表中
        const newMessage = {
          ...data.message,
          avatar: this.userInfo.avatar
        }
        
        this.messages.push(newMessage)
        this.messageContent = ''
        this.scrollToBottom()
      } else {
        uni.showToast({
          title: data.message || '发送消息失败',
          icon: 'none'
        })
      }
    },
    async sendMessage() {
      if (!this.messageContent.trim()) return
      
      if (!this.userInfo) {
        uni.showToast({
          title: '用户信息不存在',
          icon: 'none'
        })
        return
      }
      
      try {
        const message = {
          biztype: 'sendMessage',
          token: uni.getStorageSync('token'),
          to_userid: this.targetUser.userid,
          content: this.messageContent.trim(),
          type: 'text'
        }
        
        const success = await wsUtil.send(message)
        if (!success) {
          throw new Error('发送请求失败')
        }
      } catch (error) {
        console.error('发送消息失败:', error)
        uni.showToast({
          title: error.message || '发送消息失败',
          icon: 'none'
        })
      }
    },
    async loadMessages() {
      if (this.loading || !this.hasMore) return
      
      this.loading = true
      try {
        const success = await wsUtil.send({
          biztype: 'getMessages',
          token: uni.getStorageSync('token'),
          target_userid: this.targetUser.userid,
          page: this.page,
          pageSize: this.pageSize
        })

        if (!success) {
          throw new Error('发送请求失败')
        }
      } catch (error) {
        console.error('加载消息失败:', error)
        uni.showToast({
          title: error.message || '加载消息失败',
          icon: 'none'
        })
        this.loading = false
      }
    },
    loadMoreMessages() {
      if (this.hasMore) {
        this.loadMessages()
      }
    },
    scrollToBottom() {
      setTimeout(() => {
        const query = uni.createSelectorQuery()
        query.select('.message-list').boundingClientRect()
        query.exec(res => {
          if (res[0]) {
            this.scrollTop = res[0].height
          }
        })
      }, 100)
    },
    formatTime(time) {
      if (!time) return ''
      const date = new Date(time)
      const now = new Date()
      const diff = now - date
      
      if (diff < 24 * 60 * 60 * 1000) {
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      } else if (diff < 7 * 24 * 60 * 60 * 1000) {
        return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
      } else {
        return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
      }
    },
    // 切换表情选择器显示状态
    toggleEmojiPicker() {
      this.showEmojiPicker = !this.showEmojiPicker
    },
    
    // 选择表情
    onSelectEmoji(emoji) {
      this.messageContent += emoji.data
      this.showEmojiPicker = false
    },
    // 切换更多功能面板
    toggleMorePanel() {
      this.showMorePanel = !this.showMorePanel
      if (this.showMorePanel) {
        this.showEmojiPicker = false // 关闭表情选择器
      }
    },
    
    // 选择图片
    chooseImage() {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: async (res) => {
          const tempFilePath = res.tempFilePaths[0]
          try {
            uni.showLoading({
              title: '发送中...'
            })
            
            // 使用 WebSocket 发送图片
            const file = res.tempFiles[0]
            await wsUtil.sendImage(file, this.targetUser.userid)
            
            this.showMorePanel = false
          } catch (error) {
            uni.showToast({
              title: '发送失败',
              icon: 'none'
            })
            console.error('发送图片失败:', error)
          } finally {
            uni.hideLoading()
          }
        }
      })
    },
    
    // 选择文件
    chooseFile() {
      // 由于 uni-app 在小程序环境下不支持选择文件
      // 这里可以根据平台做区分处理
      // #ifdef H5 || APP-PLUS
      uni.chooseFile({
        count: 1,
        extension: ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.pdf', '.txt', '.zip', '.rar'],
        success: async (res) => {
          const file = res.tempFiles[0]
          
          try {
            uni.showLoading({
              title: '发送中...'
            })
            
            await wsUtil.sendFile(file, this.targetUser.userid)
            
            this.showMorePanel = false
          } catch (error) {
            uni.showToast({
              title: error.message || '发送失败',
              icon: 'none'
            })
            console.error('发送文件失败:', error)
          } finally {
            uni.hideLoading()
          }
        }
      })
      // #endif
      
      // #ifdef MP
      uni.showToast({
        title: '小程序暂不支持发送文件',
        icon: 'none'
      })
      // #endif
    },
    // 预览图片
    previewImage(url) {
      uni.previewImage({
        urls: [url],
        current: url
      })
    },
    // 下载文件
    downloadFile(item) {
      const fileName = item.original_name || item.content.split('/').pop();
      uni.downloadFile({
        url: item.content,
        success: (res) => {
          if (res.statusCode === 200) {
            uni.saveFile({
              tempFilePath: res.tempFilePath,
              success: (saveRes) => {
                uni.showToast({
                  title: '文件已保存',
                  icon: 'success'
                });
              },
              fail: (err) => {
                uni.showToast({
                  title: '保存文件失败',
                  icon: 'none'
                });
                console.error('保存文件失败:', err);
              }
            });
          }
        },
        fail: (err) => {
          uni.showToast({
            title: '下载文件失败',
            icon: 'none'
          });
          console.error('下载文件失败:', err);
        }
      });
    },
    // 格式化文件大小
    formatFileSize(bytes) {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }
  }
}
</script>

<style lang="scss">
.chat-detail {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;

  .message-list {
    flex: 1;
    padding: 20rpx;
    overflow-y: auto;

    .loading {
      text-align: center;
      padding: 20rpx;
      color: #999;
    }

    .message-item {
      margin-bottom: 30rpx;
    }

    .message-content {
      display: flex;
      align-items: flex-start;
      max-width: 80%;

      &.left {
        .message-bubble {
          background-color: #fff;
          border-radius: 0 20rpx 20rpx 20rpx;
          margin-left: 20rpx;
        }
      }

      &.right {
        flex-direction: row;
        margin-left: auto;
        justify-content: flex-end;

        .message-bubble {
          background-color: #07c160;
          border-radius: 20rpx 0 20rpx 20rpx;
          margin-right: 20rpx;
          order: 1;

          .message-text {
            color: #fff;
          }

          .message-time {
            color: rgba(255, 255, 255, 0.8);
          }

          // 图片消息不继承背景色
          .message-image {
            background-color: #fff;
            border-radius: 8rpx;
            margin: -20rpx; // 抵消父元素的padding
            padding: 20rpx; // 恢复padding
          }

          // 文件消息样式
          .file-message {
            background-color: #fff;
            border-radius: 8rpx;
            margin: -20rpx; // 抵消父元素的padding
            padding: 20rpx; // 恢复padding
            
            .file-info {
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            
            .file-name {
              color: #333;
            }
            
            .file-size {
              color: #999;
            }

            .file-action {
              color: #07c160;
              text-decoration: underline;
              cursor: pointer;
            }
          }
        }

        .avatar {
          order: 2;
          margin-right: 40rpx;  // 设置头像右侧边距
        }
      }

      .avatar {
        width: 80rpx;
        height: 80rpx;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .message-bubble {
        padding: 20rpx;
        position: relative;

        .message-text {
          font-size: 28rpx;
          color: #333;
          line-height: 1.5;
          word-break: break-all;
        }

        .message-image {
          max-width: 400rpx;
          border-radius: 8rpx;
          background-color: #fff;
        }

        .file-message {
          background-color: #fff;
          border-radius: 8rpx;
          margin: -20rpx; // 抵消父元素的padding
          padding: 20rpx; // 恢复padding
          
          .file-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .file-name {
            font-size: 28rpx;
            color: #333;
            display: block;
            margin-bottom: 10rpx;
          }
          
          .file-size {
            font-size: 24rpx;
            color: #999;
          }
        }

        .message-time {
          font-size: 24rpx;
          color: #999;
          margin-top: 10rpx;
          display: block;
        }
      }
    }
  }

  .input-area {
    position: relative;
    display: flex;
    align-items: center;
    padding: 20rpx;
    background-color: #fff;
    border-top: 1rpx solid #eee;
    transition: transform 0.3s ease;
    transform: translateY(0);
    z-index: 1001;

    &.panel-active {
      transform: translateY(-200rpx);
    }

    .message-input {
      flex: 1;
      height: 72rpx;
      background-color: #f5f5f5;
      border-radius: 8rpx;
      padding: 0 20rpx;
      font-size: 28rpx;
      margin-right: 20rpx;
    }

    .action-buttons {
      display: flex;
      align-items: center;
      gap: 20rpx;
    }

    .plus-btn,
    .emoji-btn,
    .send-btn {
      width: 72rpx;
      height: 72rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40rpx;
      
      &:active {
        opacity: 0.7;
      }
    }

    .send-btn {
      background-color: #07c160;
      color: #fff;
      border-radius: 8rpx;
      font-size: 28rpx;
      padding: 0;
      line-height: 72rpx;
    }
  }

  .more-panel {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: #fff;
    border-top: 1rpx solid #eee;
    z-index: 1000;
    padding: 30rpx;
    display: flex;
    flex-wrap: wrap;
    height: 200rpx;
    transform: translateY(100%);
    transition: transform 0.3s ease;

    &.show {
      transform: translateY(0);
    }

    .panel-item {
      width: 160rpx;
      height: 160rpx;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin: 20rpx;

      &:active {
        opacity: 0.7;
      }

      .item-icon {
        width: 100rpx;
        height: 100rpx;
        background-color: #f5f5f5;
        border-radius: 20rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 10rpx;
        font-size: 50rpx;
      }

      .item-text {
        font-size: 24rpx;
        color: #666;
      }
    }
  }

  .emoji-picker {
    position: fixed;
    bottom: 120rpx;
    left: 0;
    right: 0;
    background-color: #fff;
    border-top: 1rpx solid #eee;
    z-index: 1000;
    height: 400rpx;
  }
}
</style>    