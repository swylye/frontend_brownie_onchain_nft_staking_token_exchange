import '../styles/globals.css'
import { BrowserRouter as Router, Routes, Route }
  from 'react-router-dom'
import Layout from '../components/layout'


function MyApp({ Component, pageProps }) {
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  )
}

export default MyApp
