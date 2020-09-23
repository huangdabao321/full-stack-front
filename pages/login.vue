<template>
  <el-form ref="loginForm" :rules="rules" :model="formData">
    <el-form-item label="邮箱" prop="email">
      <el-input v-model="formData.email" placeholder="请输入邮箱"></el-input>
    </el-form-item>
    <el-form-item label="密码" prop="pwd">
      <el-input
        v-model="formData.pwd"
        type="password"
        placeholder="请输入密码"
      ></el-input>
    </el-form-item>
    <el-form-item label="验证码" prop="captcha">
      <el-input
        v-model="formData.captcha"
        placeholder="请输入验证码"
      ></el-input>
      <img :src="captchaUrl" @click="updateCaptcha" />
    </el-form-item>
    <el-form-item>
      <el-button type="primary" @click.native.prevent="handlerLogin"
        >登录</el-button
      >
    </el-form-item>
  </el-form>
</template>

<script>
export default {
  layout: 'login',
  data() {
    return {
      rules: {
        email: [{ required: true, message: '请输入邮箱', trigger: 'blur' }],
        pwd: [{ required: true, message: '请输入密码', trigger: 'blur' }],
        captcha: [{ required: true, message: '请输入验证码', trigger: 'blur' }],
      },
      formData: {
        email: '413209866@qq.com',
        pwd: '123456',
      },
      captchaUrl: '',
    }
  },
  mounted() {
    this.updateCaptcha()
  },
  methods: {
    updateCaptcha() {
      this.captchaUrl = '/api/captcha?t=' + Date.now()
    },
    handlerLogin() {
      this.$refs.loginForm.validate(async (valid) => {
        if (!valid) {
          return false
        }
        const res = await this.$http.post('/user/login', this.formData)
        if (res.code === 0) {
          this.$message({
            message: '登录成功',
            type: 'success',
          })
          this.$router.push('/')
        } else {
          this.$message({
            type: 'error',
            message: '登录失败',
          })
        }
      })
    },
  },
}
</script>

<style lang="scss" scoped></style>
