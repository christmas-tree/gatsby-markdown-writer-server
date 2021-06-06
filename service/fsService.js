const fsAsync = require('fs/promises');
const fs = require('fs');
const readline = require('readline');
const path = require('path');
const {CHRISTMAS_TREE_ROOT, CONTENT_LOCATION, POST_FILE_NAME} = require('./config');

// Helpers

const _loadPostFromFile = async (slug, readContent) => {
    const loc = `${CHRISTMAS_TREE_ROOT}${CONTENT_LOCATION}${slug}/${POST_FILE_NAME}`;
    await fsAsync.access(loc, fs.constants.R_OK);
    const readable = fs.createReadStream(loc);
    const reader = readline.createInterface({input: readable});
    const data = await new Promise((resolve) => {
        let startMeta = false, endMeta = false;
        let meta = [];
        let content = '';
        reader.on('line', (line) => {
            if (line === '---') {
                if (!startMeta) {
                    startMeta = true;
                    return;
                }
                if (!endMeta) {
                    endMeta = true;
                    if (!readContent) {
                        reader.close();
                    }
                    return;
                }
            }
            if (startMeta && !endMeta) {
                meta.push(line);
                return;
            }
            if (endMeta) {
                content += '\n' + line;
            }
        });
        reader.on('close', () => {
            resolve({meta, content});
        });
    });
    readable.close();
    return data;
}
const _parseMetaData = async (metaArr) => {
    const parsablePrefix = ["title", "description", "category", "cover", "date", "tags"];
    const parsedObj = {};
    for (const line of metaArr) {
        for (const prefix of parsablePrefix) {
            if (line.startsWith(prefix)) {
                parsedObj[prefix] = line.substring(prefix.length + 2);
            }
        }
    }

    parsedObj.tags && (parsedObj.tags = JSON.parse(parsedObj.tags));
    return parsedObj;
}

const getAllPosts = async () => {
    const postSlugs = await fsAsync.readdir(CHRISTMAS_TREE_ROOT + CONTENT_LOCATION);
    const posts = await Promise.all(postSlugs.map(async (slug) => {
        const {meta} = await _loadPostFromFile(slug, false);
        const parsedMeta = await _parseMetaData(meta);
        parsedMeta.slug = slug;
        return parsedMeta;
    }));
    return posts;
}

const getPost = async (slug) => {
    const {meta, content} = await _loadPostFromFile(slug, true);
    const parsedData = await _parseMetaData(meta);
    parsedData.slug = slug;
    parsedData.content = content;
    return parsedData;
}

const hasPostWithSlug = async (slug) => {
    return new Promise(((resolve) => {
        const loc = `${CHRISTMAS_TREE_ROOT}${CONTENT_LOCATION}${slug}/`;
        fsAsync.access(loc, fs.constants.R_OK)
            .then(() => resolve(true))
            .catch(() => resolve(false));
    }));
}

const updatePost = async (data, currentSlug) => {
    const {slug} = data;
    if (slug !== currentSlug) {
        const oldFolderLoc = `${CHRISTMAS_TREE_ROOT}${CONTENT_LOCATION}${currentSlug}/`;
        const newFolderLoc = `${CHRISTMAS_TREE_ROOT}${CONTENT_LOCATION}${slug}/`;
        await fsAsync.rename(oldFolderLoc, newFolderLoc);
    }
    return await savePost(data);
}

const savePost = async (data) => {
    const {title, excerpt, category, coverPath, oldCoverName, date, tags, slug, content} = data;
    const folderLoc = `${CHRISTMAS_TREE_ROOT}${CONTENT_LOCATION}${slug}/`;

    return new Promise(((resolve, reject) => {
        fs.mkdir(folderLoc, (err) => {
            if (err && err.code !== 'EEXIST') reject(err);
            let coverImgName;
            const pendingPromises = [];
            if (coverPath) {
                const extName = path.extname(coverPath);
                coverImgName = "cover" + extName;
                pendingPromises.push(fsAsync.copyFile(coverPath, folderLoc + coverImgName));
            } else if (oldCoverName) {
                coverImgName = oldCoverName;
            } else {
                reject(new Error("No cover image uploaded, no old cover image name provided"));
            }

            console.log(JSON.stringify(tags));
            let fileContent = '---\n';
            fileContent += `title: ${title}\n`;
            fileContent += `description: ${excerpt}\n`;
            fileContent += `category: ${category}\n`;
            fileContent += `cover: ${coverImgName}\n`;
            fileContent += `date: ${date}\n`;
            fileContent += `tags: ${tags}\n`;
            fileContent += '---\n\n';
            fileContent += content;

            pendingPromises.push(fsAsync.writeFile(folderLoc + POST_FILE_NAME, fileContent));

            Promise.all(pendingPromises)
                .then(() => resolve())
                .catch(() => reject());
        });
    }));
}

module.exports = {
    getAllPosts,
    getPost,
    savePost,
    updatePost,
    hasPostWithSlug,
};
