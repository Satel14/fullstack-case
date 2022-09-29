import React from 'react'

const H2A = (props) => {
  return (
    <div className='title-a'>
        <span className='title-a__1'/>
        <span className='title-a__heading'>
            {props.title}
            <span>{props.subTitle}</span>
        </span>
        <span className='title-a__r'/>
    </div>
  )
}

export default H2A