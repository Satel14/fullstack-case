import React from 'react'
import { Link } from 'react-router-dom'

const Case = (props) => {
    return (
        <Link className='case' to={"/case/" + props.data.id}>
            <img className='case-img' src={props.data.img} alt={props.data.name} />
            <div className='case-name'>{props.data.name}</div>
            <div className='case-price'>{props.data.price} ₴</div>
        </Link>
    )
}

export default Case