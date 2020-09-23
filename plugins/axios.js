import Vue from 'vue'
import axios from 'axios'
import { Message, MessageBox } from 'element-ui'
const service = axios.create({
  baseURL: '/api',
})
service.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = 'Bearer ' + token
    }
    return config
  },
  (error) => {
    Promise.reject(error)
  }
)
service.interceptors.response.use(
  (response) => {
    const { data } = response
    if (data.code !== 0) {
      Message({
        message: data.message || 'Error',
        type: 'error',
        duration: 5 * 1000,
      })
      if (data.code === 401) {
        MessageBox.confirm(
          '你已被登出，可以取消继续留在该页面，或者重新登录',
          '确定登出',
          {
            confirmButtonText: '重新登录',
            cancelButtonText: '取消',
            type: 'warning',
          }
        ).then(() => {
          location.href = '/login'
        })
      }
    }

    const token = data.data.token
    if (token) {
      localStorage.setItem('token', token)
    }
    return data
  },
  (error) => {
    Message({
      message: error.message,
      type: 'error',
      duration: 5 * 1000,
    })
    return Promise.reject(error)
  }
)

Vue.prototype.$http = service
