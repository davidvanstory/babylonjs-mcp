import React from 'react'
import { BabylonMCP } from './react/BabylonMCP'

export const App: React.FC = () => {
  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      margin: 0,
      padding: 0 
    }}>
      <h1 style={{ 
        margin: 0, 
        padding: '20px', 
        background: '#333', 
        color: 'white' 
      }}>
        Babylon.js MCP Demo
      </h1>
      
      <BabylonMCP 
        style={{ flex: 1 }}
        enableWebSocket={true}
        onSceneReady={(scene) => {
          console.log('Babylon.js scene ready!', scene)
        }}
      />
    </div>
  )
}