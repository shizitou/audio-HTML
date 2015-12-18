(function (window) {
	function _audio(option){
		var audioElem;
		this.src = option.src || null;
		this.pos = option.pos || 0;
		this.paused = true;
		this.volume = option.volume || 0.5;
		this.played = false;
		audioElem = this.audioElem = document.createElement('audio');
		audioElem.preload = 'auto';
		audioElem.volume = this.volume;
		this['_ontimeupdate'] = [];
		this['_onduration'] = [];
	}
	var pro = {
		_load: function(){
			var fn = this._load;
			if (fn.running) return;
			fn.running = true;
			var node = this.audioElem;
			var self = this;
			var listener = function() {
				self.play();
				node.removeEventListener('canplaythrough', listener, false);
				document.body.removeChild(node);
				fn.running = false;
			};
			node.addEventListener('canplaythrough', listener, false);
			document.body.appendChild(node);
		},
		_init: function(){
			var self = this;
			if (self.played) return;
			self.played = true;
			var node = self.audioElem;
			node.readyState = 4;
			// ontimeupdate
			node.addEventListener('timeupdate',function(){
				var pos = self.pos = node.currentTime;
				self.paused || self.trigger('timeupdate',pos);
			},false);
			// ondurationchange
			var durationchange;
			if('ondurationchange' in node){
				node.addEventListener('durationchange',durationHandler,false);
			}else{
				durationchange = setInterval(durationHandler,50);
			}
			function durationHandler(){
				var duration = node.duration;
				if(duration && duration!==1){
					clearInterval(durationchange);
					self.duration = duration;
					self.trigger('duration');
				}
			}
			// onprogress
			node.onprogress = function(){
				console.log(
					node.buffered[0].start(),
					node.buffered[0].end()
				);
			}
		},
		play: function(fn){
			var self = this;
			var node = self.audioElem;
			node.src = self.src;
			if (node.readyState === 4 || !node.readyState) {
				self._init();
				node.currentTime = self.pos;
				node.volume = self.volume;
				self.paused = false;
				setTimeout(function() {
					node.play();
					if(self.duration){
						fn.call(self);
					}else{
						self.on('duration',fn);
					}
				}, 1);
			} else {
				self._load();
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
	window.audio = function(src){
		return new _audio(src);
	}
})(this);