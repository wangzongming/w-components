 Component({
 	/**
 	 * 组件的属性列表
 	 */
 	properties: {
 		// 主题色
 		mainColor: String,
 		// 音频地址
 		src: String,
 		// 进度条顶部的文字
 		desc: String,
 		// 音频海报图片地址，存在时左侧会有一个图片
 		poster: String,
 		// 按钮背景颜色
 		btnBgs: Object,
 	},

 	/**
 	 * 组件的初始数据
 	 */
 	data: {
 		_mainColor: "",
 		defaultMainColor: "#59c574",
 		// 音频描述
 		desc: "",
 		// 音频地址
 		src: "",
 		// 音频海报，存在时左侧会有一个图片
 		poster: "",
 		// 是否正在播放录音
 		playStatus: "loading", // "loading" | "ready" | "ing" |  "pause" 
 		// 是否正在临时加载资源
 		onWaiting: false,
 		// 已经播放了多少 s
 		curTime: 0,
 		curTimeText: "00:00",
 		// 音频总长度
 		duration: 0,
 		durationText: "00:00",
 		// 倍速选择项数据
 		speedArray: [0.5, 0.6, 0.8, 1, 1.2, 1.5, 1.8, 2],
 		speedIndex: 3,
 		// 所有按钮背景颜色
 		_btnBgs: {},
 		// 默认背景颜色
 		defaultBtnBgs: {
 			pause: "#fff",
 			continue: "#fff",
 			play: "#fff",
 		},
 		// 所有文字 默认+传入文字进行合并
 		_text: {},
 		// 默认文字
 		defaultTexts: {
 			play: "回放",
 			playPause: "暂停",
 			playContinue: "继续",
 		},
 	},

 	/**
 	 * 组件的方法列表
 	 */
 	methods: {
 		// 播放录音
 		async play() {
 			this.audioIns.play();
 		},
 		async playPause() {
 			this.audioIns.pause();
 		},
 		async stop() {
 			this.audioIns.stop();
 		},
 		async playResume() {
 			this.audioIns.resume();
 		},
 		// 拖动进度条
 		sliderChange(event) {
 			this.audioIns.seek(event.detail.value);
 		},
 		// 倍速切换
 		playbackRate(event) {
 			const index = event.detail.value
 			this.setData({
 				speedIndex: index
 			})
 			this.audioIns.playbackRate(this.data.speedArray[index]);
 		},
 		// 语音播放操作函数
 		audioFns() {
 			const _this = this;
 			let innerAudioContext;
 			return {
 				init() {
 					// console.log('播放', _this.data.src)
 					innerAudioContext = wx.createInnerAudioContext({
 						useWebAudioImplement: true // 是否使用 WebAudio 作为底层音频驱动，默认关闭。对于短音频、播放频繁的音频建议开启此选项，开启后将获得更优的性能表现。由于开启此选项后也会带来一定的内存增长，因此对于长音频建议关闭此选项
 					})

 					//  innerAudioContext.referrerPolicy = "origin";
 					// innerAudioContext.referrerPolicy = "no-referrer";

 					setTimeout(() => {
 						innerAudioContext.src = _this.data.src;
 					}, 500)

 					innerAudioContext.onError(({
 						errMsg
 					}) => {
 						console.log(`播放错误： ${errMsg}`)
 						wx.showToast({
 							icon: "error",
 							duration: 5000,
 							title: `播放错误： ${errMsg}`,
 						})
 					})
 					// 是否可以进入播放状态
 					innerAudioContext.onCanplay(() => {
 						// console.log('onCanplay')
 						innerAudioContext.volume = 0.9;
 						// 这个事件在拖动进度条也会触发，所以需要注意
 						if (_this.data.playStatus === "loading") {
 							_this.setData({
 								onWaiting: false,
 								playStatus: "ready"
 							})
 						} else if (_this.data.playStatus === "ing") {
 							_this.setData({
 								onWaiting: false,
 							}, () => innerAudioContext.play())
 						}
 					})
 					// 进入播放状态, 开始播放或者继续播放
 					innerAudioContext.onPlay(() => {
 						_this.setData({
 							onWaiting: false,
 							playStatus: "ing",
 						})
 						// console.log('onPlay')
 					})
 					// 进度更新
 					innerAudioContext.onTimeUpdate(() => {
 						// 当前播放位置
 						const currentTime = parseInt(innerAudioContext.currentTime || 0);
 						// console.log("currentTime", currentTime)
 						let curSTime = parseInt(currentTime % 60);
 						if (curSTime < 10) {
 							curSTime = `0${curSTime}`
 						}
 						let curMTime = parseInt(currentTime / 60);
 						if (curMTime < 10) {
 							curMTime = `0${curMTime}`
 						}
 						_this.setData({
 							curTime: currentTime,
 							curTimeText: `${curMTime}:${curSTime}`
 						})

 						if (!_this.data.duration) {
 							// 总时间读取
 							const duration = parseInt(innerAudioContext.duration);
 							// console.log("duration", duration)
 							let curSTime = parseInt(duration % 60);
 							if (curSTime < 10) {
 								curSTime = `0${curSTime}`
 							}
 							let curMTime = parseInt(duration / 60);
 							if (curMTime < 10) {
 								curMTime = `0${curMTime}`
 							}
 							_this.setData({
 								duration: duration,
 								durationText: `${curMTime}:${curSTime}`
 							})
 						}
 					})

 					// innerAudioContext.onSeeked(() => {
 					// 	// console.log('完成跳转')
 					// 	// innerAudioContext.play(); 
 					// })
 					innerAudioContext.onWaiting(() => {
 						// console.log('加载资源中')
 						innerAudioContext.pause();

 						_this.setData({
 							onWaiting: true
 						})
 					})

 					// 暂停
 					innerAudioContext.onPause(() => {
 						_this.setData({
 							playStatus: "pause"
 						})
 					})

 					// 播放完毕
 					innerAudioContext.onEnded(() => {
 						_this.setData({
 							curTime: 0,
 							playStatus: "ready"
 						})
 					})

 				},
 				play() {
 					// 播放
 					innerAudioContext.play()
 				},
 				async pause() {
 					await innerAudioContext.pause()
 					return new Promise(async (resolve) => {
 						_this.setData({
 							playStatus: "pause"
 						}, () => resolve())
 					})
 				},
 				async resume() {
 					await innerAudioContext.play()
 					return new Promise(async (resolve) => {
 						_this.setData({
 							playStatus: "ing"
 						}, () => resolve())
 					})
 				},
 				// 进度跳转
 				seek(position) {
 					innerAudioContext.seek(position)
 				},
 				// 播放倍速 0.5-2.0
 				playbackRate(speend) {
 					innerAudioContext.playbackRate = speend;
 				},
 				stop() {
 					if (!innerAudioContext) return;
 					return new Promise(async (resolve) => {
 						innerAudioContext && await innerAudioContext.stop() // 暂停
 						_this.setData({
 							playStatus: "ready"
 						}, () => resolve())
 					})
 				},
 				async destroy() {
 					innerAudioContext && innerAudioContext.destroy && await innerAudioContext.destroy() // 释放音频资源
 				}
 			}
 		},
 	},

 	/**
 	 * 组件所在页面的生命周期函数
 	 */
 	lifetimes: {
 		attached() { 
 			wx.setInnerAudioOption({
 				mixWithOther: true, 
 				obeyMuteSwitch: false, 
 				success: function (e) { 
 					// console.log(e) 
 					// console.log('play success') 
 				},

 				fail: function (e) { 
 					console.log(e) 
 					console.log('play fail') 
 				} 
 			})

 			// 在组件实例进入页面节点树时执行 
 			this.setData({
 				_mainColor: this.data.defaultMainColor || this.data.mainColor,
 				_btnBgs: {
 					...this.data.defaultBtnBgs,
 					...this.data.btnBgs
 				}
 			})
 		},
 		detached() {
 			// 在组件实例被从页面节点树移除时执行
 			this.audioIns && this.audioIns.stop();
 		},
 	},
 	observers: {
 		"src": function () {
 			this.audioIns && this.audioIns.stop();
 			this.audioIns = this.audioFns();
 			this.audioIns.init();
 		}
 	},
 	behaviors: ['wx://component-export'],
 	export () {
 		const _this = this;
 		return {
 			// 播放录音
 			play() {
 				_this.play()
 			},
 			pause() {
 				_this.playPause()
 			},
 			stop() {
 				_this.stop()
			 },
			 resume(){
				_this.playResume() 
			 }
 		}
 	}
 })