import { useRef, useState } from 'react'

function Chat(): JSX.Element {
  const chat = useRef<string>('')
  const [input, setInput] = useState('')

  const generate = async (): Promise<void> => {
    try {
      const response = await window.ollamaAPI.generate('llama3.2:1b', input)
      chat.current = response.response
    } catch (error) {
      console.error(error)
    }
  }

  return (
    < >
<div style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
  <input
    type="text"
    value={input}
    onChange={(e) => setInput(e.target.value)}
  />
  <button onClick={generate}>Send</button>
</div>
<div className="chat chat-bottom" style={{ zIndex: 1000, position: 'fixed', bottom: 0, width: '100%' }}>{chat.current}</div>
    </ >
  )
}

export default Chat
