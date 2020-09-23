<template>
  <el-form ref="register" :model="formData" :rules="rules">
    <el-form-item label="邮箱" prop="email">
      <el-input v-model="formData.email" placeholder="请输入邮箱"></el-input>
    </el-form-item>
    <el-form-item label="昵称" prop="nickname">
      <el-input v-model="formData.nickname" placeholder="请输入昵称"></el-input>
    </el-form-item>
    <el-form-item label="密码" prop="pwd">
      <el-input
        v-model="formData.pwd"
        type="password"
        placeholder="请输入密码"
      ></el-input>
    </el-form-item>
    <el-form-item label="确认密码" prop="confirm_pwd">
      <el-input
        v-model="formData.confrim_pwd"
        type="password"
        placeholder="请输入确认密码"
      ></el-input>
    </el-form-item>
    <el-form-item label="验证码" prop="captcha" class="captcha-wrap">
      <el-input
        v-model="formData.captcha"
        placeholder="请输入验证码"
      ></el-input>
      <img :src="captchaUrl" @click="updateCaptcha" />
    </el-form-item>
    <el-form-item>
      <el-button type="primary" @click.native.prevent="submit">注册</el-button>
    </el-form-item>
  </el-form>
</template>

<script>
export default {
  layout: 'login',
  data() {
    const confrimPwd = (rule, value, callback) => {
      if (!value) {
        return callback(new Error('请输入确认密码'))
      }
      if (value !== this.formData.pwd) {
        this.formData.confrim_pwd = ''
        return callback(new Error('两次密码不一直请重新输入'))
      }
    }
    return {
      formData: {
        email: '413209866@qq.com',
        nickname: 'null',
        captcha: '',
        pwd: '123456',
        confrim_pwd: '123456',
      },
      rules: {
        email: [
          { required: true, message: '请输入邮箱' },
          { type: 'email', message: '请输入正确的邮箱格式' },
        ],
        nickname: [{ required: true, message: '请输入昵称' }],
        captcha: [{ required: true, message: '请输入验证码' }],
        pwd: [{ required: true, message: '请输入密码' }],
        confrim_pwd: [{ validator: confrimPwd, trigger: 'blur' }],
      },
      captchaUrl: '',
    }
  },
  mounted() {
    this.updateCaptcha()
  },
  methods: {
    submit() {
      this.$refs.register.validate(async (valid) => {
        if (valid) {
          const obj = Object.assign({}, this.formData)
          const ret = await this.$http.post('/user/register', obj)
          if (ret.code === 0) {
            this.$alert('注册成功', '成功', {
              confirmButtonText: '去登陆',
              callback: () => {
                this.$router.push('/login')
              },
            })
          } else {
            this.$message({
              showClose: true,
              message: '注册失败',
              type: 'error',
            })
          }
        } else {
          return false
        }
      })
    },
    updateCaptcha() {
      this.captchaUrl = '/api/captcha?_t=' + Date.now()
    },
  },
}
</script>

<style lang="scss" scoped>
.captcha-wrap {
  position: relative;
  img {
    position: absolute;
    right: 0;
  }
}
</style>
