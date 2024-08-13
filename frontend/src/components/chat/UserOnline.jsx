import React from 'react';

function UserOnline({nickname}) {
    return (
        <div className="flex" style={{color: "#fff", flexWrap: 'wrap'}}>
            <span>{nickname}</span>
        </div>
    )
}

export default UserOnline;