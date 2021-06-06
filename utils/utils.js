const utils = {};

utils.standardResp = ({data, error}) => {
    if (!data) data = {};
    if (!error) error = '';
    if (!(error instanceof String)) {
        error = error.toString();
    }
    return {data, error: error};
};

module.exports = utils;