/*	专为移动端设计的audio播放器
	测试兼容: UC，搜狗，百度，QQ，原生，360
	兼容平台：android，ios
	兼容声明：
		移动端大部分需要用户手动触发事件，方可进行播放
		部分平台浏览器不支持音量的设置
		部分平台浏览器不支持loadprogress事件
		尚未进行过PC段的兼容性调试，谨慎使用
**/
(function (window) {
	function _audio(option){
		var audioElem;
		var _this = this;
		this.src = option.src || null;
		/* 	部分浏览器在load调用后直到canplay触发都不进行加载,
			点击播放的,设置进度currentTime = 1 可再次触发加载
		*****/
		this.pos = option.pos || 1;
		this.paused = true;
		this.volume = option.volume || 0.5;
		this.played = false;
		/*	搜狗在使用audio标签时,必须放在页面中(不能移除)才能正常使用
			搜索支持Audio对象,并执行正常
			百度在使用audio标签时,不能获取缓冲区里的数据
			百度在Audio时,缓冲区可正常的使用
		*****/
		audioElem = this.audioElem = 
			window.Audio ? new Audio() : document.createElement('audio') ;
		audioElem.preload = 'auto';
		'timeupdate duration loadprogress loaded start'.split(' ').forEach(function(item){
			_this['_on'+item] = [];
		});
	}
	/*	play [ > _init > _load > play ]
	*/
	var pro = {
		_init: function(){
			var self = this;
			var _init = self._init;
			var node,listener,body;
			/*	and浏览器检测DOM状态时,可以使用node.readyState === 4来检测,
				但是ios里的uc浏览器这种方法并不好用,所以这里不采用DOM状态检测，
				只是在初始化时插入页面中即可
				canplay事件仍正常触发
				node.readyState在andUC上当重复刷新页面时,
				即便不插入页面,也会是4,这样会导致canplay事件逻辑得不到执行
				canplay事件触发后可以拿到duration
			*/
			if(!_init.fired){
				node = self.audioElem;
				node.src = self.src;
				listener = function() {
					self._eventBind();
					_init.loading = false;
					self.play();
					node.removeEventListener('canplay', listener, false);
				};
				node.addEventListener('canplay', listener, false);
				try{ document.body.appendChild(node); }catch(_e){}
				node.load();
				_init.loading = _init.fired = true;
				return false;
			}
			//DOM加载中,不能执行后续代码
			if(_init.loading)
				return false;
		},
		_eventBind: function(){
			var self = this;
			var node = self.audioElem;
			/* 	start 事件:【一次性事件】
				移动浏览器在未正式开始声音前,设置currentTime是无效的,
				UC浏览器更是会报错
				第一次初始化时,检测当currentTime开始有值的时候就触发
			*********/
			var startTimer = setInterval(function(){
				if(node.currentTime){
					clearInterval(startTimer);
					self._started = true;
					nextBind(node);
					try{ document.body.removeChild(node); }catch(_e){}
					self.trigger('start');
				}
			},25);
			function nextBind(node){
				// timeupdate 事件
				node.addEventListener('timeupdate',function(){
					var pos = self.pos = node.currentTime;
					self.paused || self.trigger('timeupdate',pos);
				},false);
				/* 	durationchange 事件
					在实际中,duration值可能性有三种：
						NaN 还没有值的时候
						Infinity 这是浏览器无法识别资源时长,一般是由于服务器未返回资源大小
						1 这个是无法解释的异常... 但也不是正常值
					duration值在播放后会被正确赋值出来.
					chrome:当浏览器对资源进行过缓存后,再次刷新页面时,node.duration
					会直接有正确的值,所以durationchange事件不会再触发
				****/
				var durationTimer = setInterval(function(){
					var duration = node.duration;
					if(duration && duration!==1){
						clearInterval(durationTimer);
						self.duration = duration;
						self.trigger('duration');
					}
				},25);
				/* 	progress 事件
					在duration存在之后开启,与duration值相同时结束
					原生方法中,在结束时会触发两次,
					android平台uc,魅族原生,百度 的buffered始终是0,不进行缓冲
					ios平台的浏览器到可以正常读取
					有些浏览器当资源已经被浏览器缓存时这里可能会有异常卡主的情况,
					解决办法就是切换 暂停/播放 可以缓解这种问题
					progress事件会有问题,有些时候会出现卡顿不触发
				******/
				var progressTimer;
				var prevBuffer = '';
				progressTimer = setInterval(function(){
					if(!self.duration)
						return ;
					var buffered = node.buffered;
					var bufLength = buffered.length;
					var result = [],
						resStr;
					if (bufLength) {
						for (var i = 0; i < bufLength; i++) {
							result.push([buffered.start(i), buffered.end(i)]);
						}
						resStr = result.toString();
						if (resStr != prevBuffer) {
							prevBuffer = resStr;
							self.trigger('loadprogress', result);
							//加载到最后...
							if (resStr.split(',').pop() >= self.duration) {
								self.trigger('loaded', result);
								clearInterval(progressTimer);
							}
						}
					}
				},200);
			}
		},
		/*	这里保存最近一次外部调用play时传递进来的回调,并触发
			因为第一次调用时,会进入等待状态,内部代码会多次触发play,
			所以这里先进行保存
		************/
		_playcall: null,
		play: function(fn){
			var self = this;
			var node = self.audioElem;
			fn && (self._playcall = fn);
			if(self._init()===false) return;
			self.paused = false;
			if(self._started){
				next()
			}else{
				self.on('start',next);
				//这里只是一个假意的播放,为了触发audio标签的运作
				setTimeout(function(){ node.play(); },1);
			}
			function next(){
				node.pause();
				// 有些浏览器(和平台有关) 音量属性设置无效
				node.volume = self.volume;
				// currentTime在play之前设置会报异常或不生效
				node.currentTime = self.pos;
				node.play();
				var fn = self._playcall;
				if(fn){
					self.duration ?
						fn.call(self) :
						self.on('duration',fn);
					self._playcall = null;
				}
			}
			return self;
		},
		pause: function(){
			var self = this;
			var node = self.audioElem;
			self.paused = true;
			node.pause();
		},
		stop: function(){
			var self = this;
			var node = self.audioElem;
			self.paused = true;
			node.pause();
          	self.pos = node.currentTime = 0;
		},
		getDuration: function(){
			var self = this;
			return self.duration;
		},
		on: function(event, fn) {
			this['_on' + event].push(fn);
			return this;
		},
		off: function(event, fn) {
			var self = this,
				events = self['_on' + event],
				fnString = fn ? fn.toString() : null;
			if (fnString) {
				for (var i = 0; i < events.length; i++) {
					if (fnString === events[i].toString()) {
						events.splice(i, 1);
					}
				}
			} else {
				self['_on' + event] = [];
			}
			return self;
		},
		trigger: function(event){
			var self = this,
				events = self['_on' + event],
				args = [].slice.call(arguments,1);
			for (var i = 0; i < events.length; i++) {
				events[i].apply(self, args);
			}
		}
	};
	_audio.prototype = pro;
	window.audio = function(option){
		return new _audio(option);
	}
})(this);