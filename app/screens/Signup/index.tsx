import { Image, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import Form from './components/Form'

const Signup = () => {
  return (
    <View>
      <Image source={require('../../assets/logo-image.png')} resizeMode='contain'  style={styles.logo} />
      <Form />
    </View>
  )
}

export default Signup

const styles = StyleSheet.create({
  logo: {
    width: 390, 
    height: 250
  }
})