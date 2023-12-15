import React, { useState } from 'react'
import { SketchPicker } from 'react-color';
import {Typography  } from 'antd';
const { Text } = Typography;
function ColorPicker(props) {
    const [displayColorPicker, setDisplayColorPicker] = useState(false);
    const [color, setColor] = useState({
        r: '241',
        g: '112',
        b: '19',
        a: '1',
      });
      const handleClick = () => {
        setDisplayColorPicker(!displayColorPicker)
      };
    
      const handleClose = () => {
        setDisplayColorPicker(false)
      };
    
      const handleChange = (color) => {
        props.onColorchange(color)
        setColor(color.rgb)
      };
      const styles = {
          color: {
            width: '50px',
            height: '10px',
            borderRadius: '2px',
            background: `rgba(${ color.r }, ${ color.g }, ${ color.b }, ${ color.a })`,
          },
          swatch: {
            padding: '5px',
            background: '#fff',
            borderRadius: '1px',
            boxShadow: '0 0 0 1px rgba(0,0,0,.1)',
            display: 'inline-block',
            cursor: 'pointer',
          },
          popover: {
            position: 'absolute',
            zIndex: '2',
          },
          cover: {
            position: 'fixed',
            top: '0px',
            right: '0px',
            bottom: '0px',
            left: '0px',
          }
      };
  return (
    
    <div style={{display:"flex", alignItems:"flex-start", flexDirection: "column"}}>
      <Text type="secondary" style={{marginRight:"5px"}}>Color</Text> 
       {props.disabled ? <div className='disabledColorPicker'><div style={{background:`rgba(${ color.r }, ${ color.g }, ${ color.b }, ${ color.a })`}}></div></div>
       :<><div style={styles.swatch} onClick={handleClick}>
          <div style={ styles.color } />
        </div>
        { displayColorPicker ? <div style={styles.popover}>
          <div style={styles.cover} onClick={handleClose}/>
          <SketchPicker color={color} onChange={handleChange} />
        </div> : null }</>}
    </div>
  )
}

export default ColorPicker
