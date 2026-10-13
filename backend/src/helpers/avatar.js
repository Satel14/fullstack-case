const AVATAR_IDS = [1, 2, 3, 4, 5, 6];

const DEFAULT_AVATAR = 1;

const isAcceptableAvatar = (value) => AVATAR_IDS.includes(value);

module.exports = { DEFAULT_AVATAR, isAcceptableAvatar };
