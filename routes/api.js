const express = require('express');
const multer = require('multer')
const upload = multer({dest: 'uploads/'})
const fs = require('fs');
const path = require('path');
const {updatePost} = require("../service/fsService");
const router = express.Router();
const {getAllPosts, getPost, savePost, hasPostWithSlug} = require('../service/fsService');
const cpService = require('../service/childProcessService');
const {standardResp} = require('../utils/utils');

router.get('/posts', (req, res, next) => {
    getAllPosts()
        .then(data => {
            res.json(standardResp({data}));
        })
        .catch(error => {
            res.json(standardResp({error}));
        })
});

router.get('/post/:slug', (req, res, next) => {
    const {slug} = req.params;
    getPost(slug, true)
        .then(data => {
            res.json(standardResp({data}));
        })
        .catch(error => {
            res.json(standardResp({error}));
        })
});

router.post('/post/:slug', upload.single('cover'), async (req, res, next) => {
    const {title, slug, date, content, excerpt, tags, oldCoverName} = req.body;
    const currentSlug = req.params.slug;

    const exists = await hasPostWithSlug(currentSlug);
    if (!exists) {
        res.json(standardResp({error: "No post with given slug."}));
        req.file && req.file.path && fs.unlinkSync(req.file.path);
        return;
    }

    let coverPath;
    if (req.file && req.file.path) {
        coverPath = req.file.path + path.extname(req.file.originalname);
        fs.renameSync(req.file.path, coverPath);
    }
    const data = {title, slug, date, content, excerpt, tags, coverPath, oldCoverName};

    updatePost(data, currentSlug)
        .then(() => {
            res.json(standardResp({}));
        })
        .catch(error => {
            res.json(standardResp({error}));
        })
        .finally(() => {
            if (coverPath) {
                fs.unlinkSync(coverPath);
            }
        });
});

router.post('/post', upload.single('cover'), async (req, res, next) => {
    const {title, slug, date, content, excerpt, tags} = req.body;
    const exists = await hasPostWithSlug(slug);
    if (exists) {
        res.json(standardResp({error: "A post with this slug already exists."}));
        req.file && req.file.path && fs.unlinkSync(req.file.path);
        return;
    }

    if (!req.file || !req.file.path) {
        res.json(standardResp({error: "No cover uploaded."}));
        return;
    }

    const coverPath = req.file.path + path.extname(req.file.originalname);
    fs.renameSync(req.file.path, coverPath);
    const data = {title, slug, date, content, excerpt, tags, coverPath};

    savePost(data)
        .then(() => {
            res.json(standardResp({}));
        })
        .catch(error => {
            res.json(standardResp({error}));
        })
        .finally(() => {
            if (coverPath) {
                fs.unlinkSync(coverPath);
            }
        });
});

router.get('/job', (req, res) => {
    const {command} = req.query;
    try {
        switch (command) {
            case "deploy":
                cpService.runDeploy();
                break;
            case "preview":
                cpService.runPreview();
                break;
            case "clean":
                cpService.runClean();
                break;
            case "stop":
                cpService.kill();
                break;
            default:
                res.json(standardResp({error: 'Command not found'}));
        }
        res.json(standardResp({}));
    } catch (error) {
        res.json(standardResp({error}));
    }
});

router.get('*', (req, res, next) => {
    res.json(standardResp({
        data: {
            title: "chrismas-tree-writer API",
            version: "0.1beta",
        }
    }));
});



module.exports = router;
