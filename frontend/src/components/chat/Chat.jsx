import React, { useState, useEffect } from 'react';
import { useHistory, Link } from 'react-router-dom';
import { connect } from 'react-redux';
import { message, Button, Popover } from 'antd';
import { CommentOutlined, SendOutlined, SmileOutlined } from '@ant-design/icons';
import UserOnline from './UserOnline';
import role from '../../enum/role';
import roles from '../../enum/role';
import {default as socket} from '../../api/all/ws';
import smiles from '../../data/smiles';

function TextFilter(value) {
    if (!value) {
        return;
    }
    if (value.length > 2) {
        value = value.replace(
            /(https?:\/\/.*\.(?:png|jpg|jpeg|gif))/gm,
            '<img src="$1" className="foto-chat"/>'
        );

        value = value.replace(
            /https:\/\/(?:youtu\.be\/|(?:[a-z]{2,3}\.)?youtube\.com\/watch(?:\?|#)v=)([\w-]{11}).*/gi,

            '<iframe width="500" height="282"  frameborder="0" src="http://www.youtube.com/embed/$1"/>'
        );

        smiles.forEach((smile) => {
            if (value.indexOf(smile.name) + 1) {
                value = value.replace(
                    new RegExp(smile.name, "g"),

                    `<img className="smile-img" src="${smile.url}"/>`
                );
            }
        });
    }

    return value;
}
function timeConverterHoursMin(unix) {
    const a = new Date(unix * 1000);

    const hour = a.getHours() < 10 ? `${a.getHours()}0` : a.getHours();
    const min = a.getMinutes() < 10 ? `${a.getMinutes()}0` : a.getMinutes();
    const time = `${hour}:${min}`;
    return time;
}

const ProfileAvatar = ({ id, avatar, unix }) => (
    <div className="chat-messages-list_item__profile">
        <Link to={`/profile/${id}`}>
            <div
                style={{
                    backgroundImage: `url(/img/avatars/${avatar}.webp)`,
                }}
            />
        </Link>
        <span>{timeConverterHoursMin(unix)}</span>
    </div>
);

const MessageBlock = ({ message, id, nickname }) => (
    <div className="chat-messages-list_item__msg">
        <Link to={`/profile/${id}`}>{nickname}</Link>
        <div
            dangerouslySetInnerHTML={{
                __html: TextFilter(message),
            }}
        />
    </div>
);

const Chat = ({ user, enabled }) => {
    const { id, avatar, role, login } = user;
    const [usersOnline, setUsersOnline] = useState([]);
    const [chat, setChat] = useState([]);
    const [msg, setMsg] = useState("");
    const [visible, setVisible] = useState(false);
    const history = useHistory();

    useEffect(() => {
        if (!enabled) {
            socket.disconnect();
            socket.off();
            return;
        }

        socket.connect();
        socket.on("connect", () => {
            socket.emit("user connected");
            if (login) {
                socket.emit('new-user', login);
            }
        });
        socket.on("chat messages", (chatOld) => {
            setChat(chatOld);
        })
        socket.on("user-on", (list) => {
            setUsersOnline(list);
        })
    }, [chat, enabled, login]);

    useEffect(() => {
        if (!enabled) {
            return
        }
        socket.on("chat message" , ({login, msg, id, avatar, time}) => {
            let newList = chat;
            if (chat.length > 150) {
                newList = newList.slice(
                    newList.length - 150,
                    newList.length + 1
                );
            }
            setChat([
                ...newList,
                {
                    login,
                    msg,
                    id,
                    avatar,
                    time
                }
            ])
        })

        const objDiv = document.getElementById("msg-scroll");
        objDiv.scrollTop = objDiv.scrollHeight;
    }, [chat, login, history, enabled])

    const submitMsg = (e) => {
        e.preventDefault();

        if (!id || !login) {
            message.error("Ви не авторизовані")
            return;
        }

        const checkMsg = msg.replace(/\s/g, "");

        if (msg === "" || checkMsg.length === 0) {
            message.error("Напишіть повідомлення");
            return;
        }

        socket.emit("chat message" , {
            login,
            msg,
            id,
            avatar,
            time: Math.round(Date.now() / 1000)
        })

        let newList = chat;
        if (chat.length > 150) {
            newList = newList.slice(
                newList.length - 150,
                newList.length + 1
            );
        }

        setChat([
            ...newList,
            {
                login,
                msg,
                id,
                avatar,
                time: Math.round(Date.now() / 1000)
            }
        ])
        setMsg("");
    }

    return (
        <div className="chat">
            <div className="chat-header">
                <div className="chat-header_icon">
                    <CommentOutlined/>
                </div>
                <div className="chat-header_name">
                    Онлайн чат
                    <div className="chat-header_name__online">
                        <i className="blink"/>
                        {usersOnline !== null ? usersOnline.length : "0"}
                    </div>
                </div>
                <div className="chat-header_sub">
                    <div className="chat-header_sub_whos">
                        <Popover
                            placement="bottom"
                            content={
                                <>
                                    {usersOnline !== null
                                        ? usersOnline.map((el, index) => (
                                            <div key={index}>
                                                <UserOnline nickname={el}/>
                                            </div>
                                        ))
                                        : ''}
                                </>
                            }
                            trigger="click"
                        >
                            <Button className="color-white small">Хто в чаті</Button>
                        </Popover>
                    </div>
                    <div className="chat-header_sub_rules">
                        {/* <Rules/> */}
                    </div>
                </div>

                <div className="chat-header_closebutton">
                    <Button
                        className="color-grey small"
                        onClick={() => window.Layout.onCollapseChat(true)}
                    >
                        Приховати
                    </Button>
                </div>
            </div>
            <div className="chat-messages" id="msg-scroll">
                <ul className="chat-messages-list">
                    {chat.map((el, index) => (
                        <li key={"chat" + index} className="chat-messages-list_item">
                            <ProfileAvatar id={el.id} avatar={el.avatar} unix={el.time} />
                            <MessageBlock nickname={el.login} id={el.id} message={el.msg} />
                        </li>
                    ))}
                </ul>{" "}
            </div>
            <div className="chat-form">
                {role && (
                    <>
                        {roles.BANNED_CHAT !== role ? (
                            <form onSubmit={(e) => submitMsg(e)}>
                                <input
                                    type="text"
                                    name="message"
                                    onChange={(e) => {
                                        setMsg(e.target.value);
                                    }}
                                    // disabled
                                    // value={"виключено чат"}
                                />
                                <Popover
                                placement="topLeft"
                                visible={visible}
                                onVisibleChange={(e) => setVisible(e)}
                                content={
                                    <div className="smiles-list">
                                        {smiles.map((smile, i) => (
                                            <div
                                            key={"smile" + i}
                                            style={{
                                                backgroundImage: `url(${smile.url})`,
                                            }}
                                            onClick={(e) => {
                                                setMsg(`${msg} ${smile.name}`), setVisible(false);
                                            }}
                                            />
                                            ))}
                                    </div>
                                }
                                trigger="click"
                                >
                                    <Button
                                    style={{ marginRight: "4%", width: "16%"}}
                                    className="color-black"
                                    >
                                        <SmileOutlined/>

                                    </Button>
                                </Popover>
                                <Button
                                    style={{ width: "80%" }}
                                    className="color-skyblue"
                                    onClick={(e) => submitMsg(e)}
                                    // disabled={!login}
                                    // disabled={true}
                                >
                                    <SendOutlined />
                                </Button>
                            </form>
                        ) : (
                            <div
                                className="flex"
                                style={{
                                    alignItems: "center",
                                    justifyContent: "center",
                                    height: "110px",
                                }}
                            >
                                Вас заблоковано в чаті
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

const mapStateToProps = (state) => ({
    user: state.user,
});

export default connect(mapStateToProps, null)(Chat);