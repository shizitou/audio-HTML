# audio-HTML
  	基于audio标签的声音播放器库
## 专为移动端设计的audio播放器
  	基于HTML标签
## 测试兼容: 
  	UC，搜狗，百度，QQ，原生，360
## 兼容平台：
  	android，ios
## 兼容声明：
	移动端大部分需要用户手动触发事件，方可进行播放
	部分平台浏览器不支持音量的设置
	部分平台浏览器不支持loadprogress事件
	尚未进行过PC段的兼容性调试，谨慎使用
## 使用声明
```javascript
	var player = audio({
		src: 'xxxxx',
		volume: 1(0.001-1),
		pos: 2(秒)
	});
	player.play(function(){
		//触发到这里时,音乐已经开始播放
		console.log(player.duration);
	});
	player.on('timeupdate',function(pos){});
	player.on('loadprogress',function(pro){});
	player.on('loaded',function(){});
```
## 特殊声明
	由于未测试过src切换时产生的兼容性问题，
	当页面需要使用多个音频文件时，建议对多个audio对象进行管理。
