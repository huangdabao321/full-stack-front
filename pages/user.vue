<template>
  <div>
    <h1>用户中心</h1>
    <div ref="upload" class="upload-container">
      <input type="file" name="file" @change="handleFileChange" />
    </div>
    <el-progress :percentage="progress" :stroke-width="20"></el-progress>
    <button type="button" class="" @click="handleUpload">上传</button>
    <div>
      <el-progress :percentage="hashProgress" :stroke-width="20"></el-progress>
    </div>
    <div
      class="sub-container"
      :style="{
        witdh: subWidth + 'px',
      }"
    >
      <div v-for="chunk in chunks" :key="chunk.name" class="sub">
        <div
          :class="{
            uploading: chunk.progress > 0 && chunk.progress < 100,
            success: chunk.progress === 100,
            error: chunk.progress === -1,
          }"
          :style="{
            height: chunk.progress + '%',
          }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script>
import sparkMD5 from 'spark-md5'
const SIZE = 0.1 * 1024 * 1024
export default {
  name: 'User',
  data() {
    return {
      file: null,
      hashProgress: 0,
      chunks: [],
    }
  },
  computed: {
    subWidth() {
      return Math.ceil(Math.sqrt(this.chunks.length)) * 16
    },
    progress() {
      if (!this.file || !this.chunks.length) {
        return 0
      }
      const loaded = this.chunks
        .map((item) => item.chunk.size * item.progress)
        .reduce((acc, curr) => acc + curr, 0)
      return parseInt((loaded / this.file.size).toFixed(0))
    },
  },
  async mounted() {
    const ret = await this.$http.get('/user/info')
    const uploadWrap = this.$refs.upload
    uploadWrap.addEventListener('dragover', function (e) {
      uploadWrap.style.borderColor = 'red'
      e.preventDefault()
    })
    uploadWrap.addEventListener('dragleave', function (e) {
      uploadWrap.style.borderColor = '#ccc'
      e.preventDefault()
    })
    uploadWrap.addEventListener('drop', (e) => {
      uploadWrap.style.borderColor = '#ccc'
      const fileList = e.dataTransfer.files
      this.file = fileList[0]
      e.preventDefault()
    })
  },
  methods: {
    handleFileChange(e) {
      const [file] = e.target.files
      if (!file) {
        return
      }
      this.file = file
    },
    async handleUpload() {
      if (!this.file) {
        return
      }
      const valid = await this.validateType(this.file)
      if (!valid) {
        this.$message({
          message: '文件类型不允许',
          type: 'error',
        })
        return
      }
      //切片
      const chunks = this.createChunks(this.file)
      const hash = await this.caleHashWorker(chunks)
      //const hash1 = await this.caleHashRequestIdleCallback(chunks)
      //const hash2 = await this.calceHashSmale(this.file)
      this.hash = hash
      //秒传
      const {
        data: { uploaded, uploadedList },
      } = await this.$http.post('/checkFile', {
        hash,
        ext: this.file.name.split('.').pop(),
      })
      if (uploaded) {
        return this.$message.success('秒传成功')
      }
      this.chunks = chunks.map((chunk, index) => {
        const name = hash + '-' + index
        return {
          hash,
          name,
          index,
          chunk: chunk.file,
          progress: uploadedList.includes(name) ? 100 : 0,
        }
      })
      //上传切片
      await this.uploadSube(uploadedList)
    },
    async uploadSube(uploadedList) {
      const requests = this.chunks
        .filter((chunk) => !uploadedList.includes(chunk.name)) //续传 过滤已经上传的chunk
        .map((chunk) => {
          const form = new FormData()
          form.append('name', chunk.name)
          form.append('chunk', chunk.chunk)
          form.append('hash', chunk.hash)
          return { form, index: chunk.index, error: 0 }
        })

      //并发控制
      await this.sendRequet(requests)
      await this.mergeFile()
    },
    async mergeFile() {
      this.$http.post('/mergefile', {
        ext: this.file.name.split('.').pop(),
        size: SIZE,
        hash: this.hash,
      })
    },
    async sendRequet(chunks, limit = 4) {
      return new Promise((resolve, reject) => {
        const len = chunks.length
        let count = 0
        let stop = false
        const start = async () => {
          if (stop) return
          const task = chunks.shift()
          if (task) {
            const { form, index } = task
            try {
              await this.$http.post('/upload', form, {
                onUploadProgress: (e) => {
                  this.chunks[index].progress = parseInt(
                    ((100 * e.loaded) / e.total).toFixed(0)
                  )
                },
              })
              if (count === len - 1) {
                resolve()
              } else {
                count++
                start()
              }
            } catch (error) {
              //上传出错
              this.chunks[index].progress = -1
              if (task.error < 3) {
                task.error++
                chunks.unshift(task) //重新加入队列
                start()
              } else {
                stop = true
                reject('错误超过3次,请求停止!')
              }
            }
          }
        }
        while (limit > 0) {
          start()
          limit--
        }
      })
    },
    // 前后2M,中间每个块 取前中后各两个字节 减少运算量
    async calceHashSmale(file) {
      return new Promise((resolve) => {
        const size = file.size
        const offset = 2 * 1024 * 1024
        let current = offset
        const chunks = [file.slice(0, offset)]
        while (current < size) {
          //最后一个块
          if (current + offset >= size) {
            chunks.push(file.slice(current, current + offset))
          } else {
            //中间区块
            const mid = (current + offset) / 2
            const end = current + offset
            chunks.push(file.slice(current, current + 2))
            chunks.push(file.slice(mid, mid + 2))
            chunks.push(file.slice(end - 2, end))
          }
          current += offset
        }
        const spark = new sparkMD5.ArrayBuffer()
        const reader = new FileReader()
        reader.readAsArrayBuffer(new Blob(chunks))
        reader.onload = (e) => {
          spark.append(e.target.result)
          resolve(spark.end())
        }
      })
    },
    createChunks(file) {
      let current = 0
      const length = file.size
      const chunks = []
      while (current < length) {
        chunks.push({
          file: file.slice(current, current + SIZE),
        })
        current += SIZE
      }
      return chunks
    },
    async caleHashRequestIdleCallback(chunks) {
      return new Promise((resolve) => {
        let count = 0
        const spark = new sparkMD5.ArrayBuffer()
        const appendToSpark = async (blob) => {
          return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = (e) => {
              spark.append(e.target.result)
              resolve()
            }
            reader.readAsArrayBuffer(blob)
          })
        }
        const workLoop = async (deadline) => {
          while (count < chunks.length && deadline.timeRemaining() > 1) {
            // 空闲时间 且有任务
            await appendToSpark(chunks[count].file)
            count++
            if (count < chunks.length) {
              this.hashProgress = Number(
                ((count * 100) / chunks.length).toFixed(0)
              )
            } else {
              this.hashProgress = 100
              resolve(spark.end())
            }
          }
          window.requestIdleCallback(workLoop)
        }
        window.requestIdleCallback(workLoop)
      })
    },
    async caleHashWorker(chunks) {
      return await new Promise((resolve, reject) => {
        const worker = new Worker('/hash.js')
        worker.postMessage({ chunks })
        worker.onmessage = (e) => {
          const { progress, hash } = e.data
          this.hashProgress = progress
          if (hash) {
            resolve(hash)
          }
        }
      })
    },
    async validateType(file) {
      return (await this.isPng(file)) || (await this.isJpg(file))
    },
    async isPng(file) {
      const res = await this.readFile(file.slice(0, 8))
      return res === '89 50 4E 47 0D 0A 1A 0A'
    },
    async isJpg(file) {
      const length = file.length
      const head = await this.readFile(file.slice(0, 2))
      const tail = await this.readFile(file.slice(-2, length))
      return head === 'FF D8' && tail === 'FF D9'
    },

    readFile(blob) {
      return new Promise((resolve, reject) => {
        const fileReader = new FileReader()
        fileReader.onload = function (e) {
          const res = fileReader.result
            .split('')
            .map((v) => v.charCodeAt())
            .map((v) => v.toString(16).toUpperCase().padStart(2, 0))
            .join(' ')
          resolve(res)
        }
        fileReader.readAsBinaryString(blob)
      })
    },
  },
}
</script>

<style lang="scss" scoped>
.upload-container {
  height: 80px;
  border: 2px dashed #ccc;
  text-align: center;
  line-height: 80px;
}
.upload-container ~ button {
  margin-top: 30px;
}
.sub-container {
  .sub {
    float: left;
    height: 16px;
    width: 16px;
    border: 1px solid black;
    background: #ccc;
    .success {
      background: green;
    }
    .uploading {
      background: blue;
    }
    .error {
      background: red;
    }
  }
}
</style>
