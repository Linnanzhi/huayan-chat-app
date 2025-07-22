<template>
  <view class="emoji-picker">
    <scroll-view scroll-y class="emoji-list">
      <view class="emoji-group" v-for="(group, index) in emojiGroups" :key="index">
        <view class="emoji-item" v-for="emoji in group" :key="emoji" @tap="selectEmoji(emoji)">
          {{emoji}}
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
export default {
  name: 'EmojiPicker',
  data() {
    return {
      emojiGroups: [
        ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇'],
        ['😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛'],
        ['😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏'],
        ['😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫'],
        ['😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳'],
        ['🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭'],
        ['🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧'],
        ['😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢'],
        ['🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '💩', '👻', '👽'],
        ['🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾']
      ]
    }
  },
  methods: {
    selectEmoji(emoji) {
      this.$emit('select', { data: emoji })
    }
  }
}
</script>

<style lang="scss">
.emoji-picker {
  background-color: #fff;
  border-top: 1rpx solid #eee;
  
  .emoji-list {
    height: 400rpx;
    padding: 20rpx;
  }
  
  .emoji-group {
    display: flex;
    flex-wrap: wrap;
    margin-bottom: 20rpx;
  }
  
  .emoji-item {
    width: 80rpx;
    height: 80rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40rpx;
    cursor: pointer;
    
    &:active {
      background-color: #f5f5f5;
      border-radius: 8rpx;
    }
  }
}
</style> 