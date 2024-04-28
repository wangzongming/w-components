 Component({
 	/**
 	 * 组件的属性列表
 	 */
 	properties: {
 		// 可以替换默认微信录音设置
 		recorderManagerOptions: Object,
 		// 文本
 		texts: Object,
 		// 按钮背景颜色
 		btnBgs: Object,
 	},

 	/**
 	 * 组件的初始数据
 	 */
 	data: {
 		// 录音状态
 		recordStatus: "ready", // "ready" | "ing" |  "pause" | "stop" 
 		// 音频地址-本地地址
 		audioSrc: "",
 		// 是否正在播放录音
 		playStatus: "ready", // "ready" | "ing" |  "pause" 
 		// 已经录制了多少 ms
 		recordedMs: 0,
 		recordedMsText: "0′ 0″",
 		// 最长可以录制多少秒，实际上就是 _recorderManagerOptions.duration
 		recordDuration: 0,

 		// 录音器配置
 		_recorderManagerOptions: {},
 		defaultRecorderManagerOptions: {
 			duration: 600000,
 			// duration: 1000 * 10,
 			sampleRate: 44100,
 			numberOfChannels: 1,
 			format: 'mp3',
 			frameSize: 50,
 			encodeBitRate: 64000,
 		},

 		// 所有按钮背景颜色
 		_btnBgs: {},
 		// 默认背景颜色
 		defaultBtnBgs: {
 			start: "linear-gradient(to bottom,#59c574 , #67d467, #67d467)",
 			stop: "linear-gradient(to bottom,#4c7ef3 , #589af8, #589af8)",
 			pause: "#fff",
 			pauseBorder: "#59c574",
 			continue: "#fff",
 			reset: "linear-gradient(to bottom,#59c574 , #67d467, #67d467)",
 			play: "linear-gradient(to bottom,#4c7ef3 , #589af8, #589af8)",
 		},
 		// 所有文字 默认+传入文字进行合并
 		_text: {},
 		// 默认文字
 		defaultTexts: {
 			start: "开始录音",
 			stop: "结束录音",
 			continue: "继续录音",
 			reset: "重录",
 			play: "回放",
 			playPause: "暂停",
 			playContinue: "继续",
 		},
 	},
 	/**
 	 * 录音实例
 	 */
 	recorderManager: null,
 	/**
 	 * 倒计时圆圈 ctx
 	 */
 	ctx: null,
 	/**
 	 * 组件的方法列表
 	 */
 	methods: {
 		// 开始录音
 		async start() {
 			if (this.data.recordStatus === "ing") {
 				// console.log('正在录音中')
 				return;
 			}
 			this.audioIns && this.audioIns.stop();
 			// console.log('开始录音')
 			const startedFn = () => {
 				this.setData({
 					recordStatus: "ing",
 					recordedMs: 0,
 					recordedMsText: "0′ 0″",
 					recordDuration: this.data._recorderManagerOptions.duration,
 				}, () => {
 					// 开始计时动画
 					this.jsFn();
 					this.progressInit();
 				})
 			}

 			const recorderManager = wx.getRecorderManager()
 			const options = {
 				...this.data._recorderManagerOptions
 			}
 			wx.authorize({
 				scope: 'scope.record',
 				success(res) {
 					console.log("录音授权成功", res);
 					// 用户已经同意小程序使用录音功能，后续调用recorderManager.start 接口不会弹窗询问
 					recorderManager.start(options); //使用新版录音接口，可以获取录音文件
 				},
 				fail() {
 					console.log("第一次录音授权失败");
 					wx.showModal({
 						title: '提示',
 						content: '您未授权录音，功能将无法使用',
 						showCancel: true,
 						confirmText: "授权",
 						confirmColor: "#AF1F25",
 						success(res) {
 							if (res.confirm) {
 								//确认则打开设置页面（自动切到设置页）
 								wx.openSetting({
 									success: (res) => {
 										console.log(res.authSetting);
 										if (!res.authSetting['scope.record']) {
 											//未设置录音授权
 											console.log("未设置录音授权");
 											wx.showModal({
 												title: '提示',
 												content: '您未授权录音，功能将无法使用', // 可以自己编辑
 												showCancel: false,
 												success: function (res) {
 													console.log("不知道打印的啥？")
 												},
 											})
 										} else {
 											//第二次才成功授权
 											console.log("设置录音授权成功");
 											recorderManager.start(options);
 										}
 									},
 									fail: function () {
 										console.log("授权设置录音失败");
 									}
 								})
 							} else if (res.cancel) {
 								console.log("cancel");
 							}
 						},
 						fail() {
 							console.log("openfail");
 						}
 					})
 				}
 			})

 			recorderManager.onStart(() => {
 				// console.log('recorder start')
 				startedFn();
 			})
 			recorderManager.onPause(() => {
 				// console.log('recorder pause')
 				this.setData({
 					recordStatus: "pause"
 				})
 				// 停止计时动画
 				clearInterval(this.djsTimer)
 			})
 			recorderManager.onResume(() => {
 				// console.log('recorder onResume') 
 				this.setData({
 					recordStatus: "ing"
 				})
 				// 恢复计时动画
 				this.jsFn();
 				this.progressInit();
 			})

 			recorderManager.onStop((res) => {
 				// console.log('recorder stop', res)
 				const {
 					tempFilePath
 				} = res
 				// 停止计时动画
 				clearInterval(this.djsTimer)

 				this.setData({
 					recordStatus: "stop",
 					audioSrc: tempFilePath
 				})
 				// 触发结束回调
 				this.triggerEvent('onEnd', {
 					tempFilePath: tempFilePath
 				})
 			})

 			recorderManager.onError(({
 				errMsg
 			}) => {
 				console.log('recorder error', errMsg)
 				wx.showToast({
 					icon: "error",
 					duration: 5000,
 					title: `录音错误： ${errMsg}`,
 				})
 			})


 			this.recorderManager = recorderManager;
 		},
 		// 暂停录音
 		async pause() {
 			// console.log('暂停录音')
 			this.recorderManager.pause()
 		},
 		// 停止录音
 		async stop() {
 			// console.log('停止录音')
 			if (!this.recorderManager) return;
 			await this.recorderManager.stop();
 		},
 		// 继续录音
 		async continue () {
 			// console.log('继续录音')
 			await this.recorderManager.resume();
 		},

 		// 播放录音
 		async play() {
 			// console.log('播放录音')
 			this.audioIns = this.audioFns();
 			this.audioIns.init();
 		},
 		async playPause() {
 			// console.log('暂停播放录音')
 			this.audioIns.pause();
 		},
 		async playResume() {
 			// console.log('暂停播放继续')
 			this.audioIns.resume();
 		},
 		// 重录
 		async reset() {
 			// console.log('重录')
 			this.start()
 			// 触发重录回调
 			this.triggerEvent('onResume', {})
 		},

 		// 计时
 		jsFn() {
 			clearInterval(this.djsTimer)
 			this.djsTimer = setInterval(() => {
 				if (this.data.recordedMs >= this.data.recordDuration) {
 					clearInterval(this.djsTimer)
 					return;
 				}

 				const curMsTime = this.data.recordedMs + 1000;
 				const curSTime = parseInt(curMsTime / 1000 % 60);
 				const curMTime = parseInt(curMsTime / 1000 / 60);
 				// 百分比
 				const percent = curMsTime / this.data.recordDuration;
 				// 百分比转角度
 				const deg = percent * 360;
 				// 绘制弧度
 				this.progressUpdate(deg);
 				this.setData({
 					recordedMs: curMsTime,
 					recordedMsText: `${curMTime}′ ${curSTime}″`
 				})
 			}, 1000)
 		},
 		// 进度条绘制函数
 		progressInit() {
 			// 绘制进度条 
 			wx.createSelectorQuery().in(this).select('#time-canvas')
 				.fields({
 					node: true,
 					size: true
 				})
 				.exec((res) => {
 					if (!res[0]) return;
 					const canvas = res[0].node
 					const ctx = canvas.getContext('2d')
 					const dpr = wx.getSystemInfoSync().pixelRatio;
 					const o_size = res[0].width;
 					const size = o_size * dpr;
 					this.ctx = ctx;
 					this.ctxSize = o_size;

 					this.inited = true;
 					canvas.width = size;
 					canvas.height = size;
 					ctx.scale(dpr, dpr);
 					this.data.recordedMs && this.progressUpdate(this.data.recordedMs / this.data.recordDuration * 360)
 				})
 		},
 		// 需要不断更新 
 		progressUpdate(deg) {
 			const ctx = this.ctx,
 				o_size = this.ctxSize;
 			if (!ctx) return;
 			const pcDeg = (Math.PI / 180) * 90;
 			const sDeg = 0 - pcDeg;
 			const eDeg = (Math.PI / 180) * deg - pcDeg;
 			ctx.clearRect(0, 0, this.ctxSize, this.ctxSize); //清空所有的内容
 			ctx.strokeStyle = this.data._btnBgs.pauseBorder
 			ctx.lineWidth = 1;
 			ctx.beginPath();
 			ctx.arc(o_size / 2, o_size / 2, o_size / 2 - 1, sDeg, eDeg);
 			ctx.stroke();
 		},
 		// 语音播放操作函数
 		audioFns() {
 			const _this = this;
 			let innerAudioContext;
 			return {
 				init() {
 					innerAudioContext = wx.createInnerAudioContext({
 						useWebAudioImplement: true // 是否使用 WebAudio 作为底层音频驱动，默认关闭。对于短音频、播放频繁的音频建议开启此选项，开启后将获得更优的性能表现。由于开启此选项后也会带来一定的内存增长，因此对于长音频建议关闭此选项
 					})
 					innerAudioContext.src = _this.data.audioSrc
 					innerAudioContext.play() // 播放
 					innerAudioContext.onEnded(() => {
 						// 播放完毕
 						_this.setData({
 							playStatus: "ready"
 						})
 					})
 					_this.setData({
 						playStatus: "ing"
 					})
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
 			// 在组件实例进入页面节点树时执行 
 			this.setData({
 				_recorderManagerOptions: {
 					...this.data.defaultRecorderManagerOptions,
 					...this.data.recorderManagerOptions,
 				},
 				_text: {
 					...this.data.defaultTexts,
 					...this.data.texts
 				},
 				_btnBgs: {
 					...this.data.defaultBtnBgs,
 					...this.data.btnBgs
 				}
 			})
 		},
 		detached() {
 			// console.log(wx.getRecorderManager())
 			// 在组件实例被从页面节点树移除时执行
 			this.audioIns && this.audioIns.stop();
 			if (this.data.recordStatus === "ing" || this.data.recordStatus === "pause") {
 				this.recorderManager && this.recorderManager.stop();
 			}
 		},
 	},

 	behaviors: ['wx://component-export'],
 	export () {
 		const _this = this;
 		return {
 			// 开始录音
 			startRecord() {
 				_this.start()
 			},
 			// 结束录音
 			stopRecord() {
 				_this.stop()
 			},
 			// 播放录音
 			play() {
 				_this.play()
 			},
 			// 重置到 ready 状态
 			toReady() {
 				_this.setData({
 					recordStatus: "ready"
 				})
 			}
 		}
 	}
 })