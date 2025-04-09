const qpm = require('query-params-mongo');
const createModel = require('./createModel.js');

let getObjectId = function(val) {
    return mongoose.Types.ObjectId(val);
};

var processQuery = qpm({
    autoDetect: [
        { fieldPattern: /_id$/, dataType: 'objectId' },
        { fieldPattern: /orderNo$/, dataType: 'string' },
    ],
    converters: {objectId: getObjectId }
});

const all_modules = {
    twoBlogs: async function (req, res) {
        let model = await createModel(`${req.params.brand}-blogs`);
        let blogs = await model.find({ visibility: "blog" }).limit(2);
        return blogs;
    },

    footerBlogs: async function (req, res) {
        let model = await createModel(`${req.params.brand}-blogs`);
        let blogs = await model.find({ visibility: "page" }).limit(5);
        return blogs;
    },

    threePages: async function (req, res) {
        let model = await createModel(`${req.params.brand}-blogs`);
        return {
            education: await model.findOne({ slug: "education" }).lean(),
            helpAndSupport: await model.findOne({ slug: "help-and-support" }).lean(),
            volunteering: await model.findOne({ slug: "volunteering" }).lean()
        };
    },

    gallery: async function (req, res) {
        let model = await createModel(`${req.params.brand}-gallery`);
        let output = await model.find().lean();
        output = output.map(val => {
            val.number = val.url.split("/image/upload/")[1].split("/dedicatedparents/")[0];
            val.slug = val.url.split("/gallery-photos/")[1];
            return val;
        });
        return output;
    },

    causes: async function (req, res) {
        let model = await createModel(`${req.params.brand}-causes`);
        let output = await model.find().lean();
        output = output.map(val => {
            val.number = val.bannerImg.split("/image/upload/")[1].split("/dedicatedparents/")[0];
            val.imgSlug = val.bannerImg.split("/causes-photos/")[1];
            return val;
        });
        return output;
    },

    pastThreeEvents: async function (req, res) {

        req.query = processQuery(req.query);
        let model = await createModel(`${req.params.brand}-events`);
        let output = await model.aggregate([
            [
                {
                    $addFields: {
                        newDate: {
                            $dateFromString: {
                                dateString: "$date",
                            }
                        }
                    },
                },
                {
                    $match: {
                        newDate: {
                            $lt: new Date()
                        }
                    }
                },
                {
                    $sort: {
                        newDate: -1
                    }
                },
                {
                    $limit: 3
                }
            ]
        ]);
        return output;

    },

    futureThreeEvents: async function (req, res) {
    
        req.query = processQuery(req.query);
        let model = await createModel(`${req.params.brand}-events`);
        let output = await model.aggregate([
            [
                {
                    $addFields: {
                        newDate: {
                            $dateFromString: {
                                dateString: "$date",
                            }
                        }
                    },
                },
                {
                    $match: {
                        newDate: {
                            $gt: new Date() 
                        }
                    }
                },
                {
                    $sort: {
                        newDate: 1 
                    }
                },
                {
                    $limit: 3 
                }
            ]
        ]);
        return output;
    
    },    

    pastEvents: async function (req, res) {
        req.query = processQuery(req.query);
        let model = await createModel(`${req.params.brand}-events`);
        let output = await model.aggregate([
            [
                {
                    $addFields: {
                        newDate: {
                            $dateFromString: {
                                dateString: "$date",
                            }
                        }
                    },
                },
                {
                    $match: {
                        newDate: {
                            $lt: new Date()
                        }
                    }
                },
                {
                    $sort: {
                        newDate: -1
                    }
                }
            ]
        ]);
        return output;

    },

    futureEvents: async function (req, res) {

        req.query = processQuery(req.query);
        let model = await createModel(`${req.params.brand}-events`);
        let output = await model.aggregate([
            [
                {
                    $addFields: {
                        newDate: {
                            $dateFromString: {
                                dateString: "$date",
                            }
                        }
                    },
                },
                {
                    $match: {
                        newDate: {
                            $gt: new Date()
                        }
                    }
                },
                {
                    $sort: {
                        newDate: -1
                    }
                }
            ]
        ]);
        return output;

    },

    staffs: async function (req, res) {
        let model = await createModel(`${req.params.brand}-staffs`);
        let output = await model.find().lean();
        return output;
    },

    blogPosts: async function(req,res) {
        let model = await createModel(`${req.params.brand}-blogs`);
        let output = await model.find({visibility: "blog"}).sort({_id: -1}).lean();
        output = output.map( val => {
            val.number = val.bannerImg.split("/image/upload/")[1].split("/dedicatedparents/")[0];
            val.imgSlug = val.bannerImg.split("/blogs-photos/")[1]
            return val;
        });
        return output;
    },

    pages: async function(req,res) {
        let model = await createModel(`${req.params.brand}-blogs`);
        let output = await model.find({visibility: "page"}).sort({_id: -1}).lean();
        output = output.map( val => {
            val.number = val.bannerImg.split("/image/upload/")[1].split("/dedicatedparents/")[0];
            val.imgSlug = val.bannerImg.split("/pages-photos/")[1]
            return val;
        });
        return output;
    },

    blog: async function(req,res) {
        let model = await createModel(`${req.params.brand}-blogs`);

        // Find the current document based on the slug
        let currentDocument = await model.findOne({ slug: req.params.slug }).lean();

        if (!currentDocument) {
            return res.status(404).json({ message: 'Document not found' });
        };

        currentDocument.number = currentDocument.bannerImg.split("/image/upload/")[1].split("/dedicatedparents/")[0];
        currentDocument.imgSlug = currentDocument.bannerImg.split("/blogs-photos/")[1];

        // Find the next document (using _id for simplicity, assuming it's auto-incremented or timestamped)
        let nextDocument = await model.findOne({ 
            _id: { $gt: currentDocument._id } ,
            visibility: "blog"
        }).sort({ _id: 1 }).lean();

        // Find the previous document
        let prevDocument = await model.findOne({ 
            _id: { $lt: currentDocument._id } ,
            visibility: "blog"
        }).sort({ _id: -1 }).lean();

        if (!nextDocument) {
            nextDocument = await model.findOne({visibility: "blog"}).sort({ _id: 1 }).lean();
        };

        // If no previous document is found, fetch the last document (wrap around)
        if (!prevDocument) {
            prevDocument = await model.findOne({visibility: "blog"}).sort({ _id: -1 }).lean();
        };

        // Return the current, next, and previous documents
        return {
            current: currentDocument,
            next: nextDocument,
            prev: prevDocument
        };
    },

    page: async function(req,res) {
        let model = await createModel(`${req.params.brand}-blogs`);

        // Find the current document based on the slug
        let currentDocument = await model.findOne({ slug: req.params.slug }).lean();

        if (!currentDocument) {
            return res.status(404).json({ message: 'Document not found' });
        };

        currentDocument.number = currentDocument.bannerImg.split("/image/upload/")[1].split("/dedicatedparents/")[0];
        currentDocument.imgSlug = currentDocument.bannerImg.split("/pages-photos/")[1];

        // Find the next document (using _id for simplicity, assuming it's auto-incremented or timestamped)
        let nextDocument = await model.findOne({ 
            _id: { $gt: currentDocument._id } ,
            visibility: "page"
        }).sort({ _id: 1 }).lean();

        // Find the previous document
        let prevDocument = await model.findOne({ 
            _id: { $lt: currentDocument._id } ,
            visibility: "page"
        }).sort({ _id: -1 }).lean();

        if (!nextDocument) {
            nextDocument = await model.findOne({visibility: "page"}).sort({ _id: 1 }).lean();
        };

        // If no previous document is found, fetch the last document (wrap around)
        if (!prevDocument) {
            prevDocument = await model.findOne({visibility: "page"}).sort({ _id: -1 }).lean();
        };

        // Return the current, next, and previous documents
        return {
            current: currentDocument,
            next: nextDocument,
            prev: prevDocument
        };
    },

    getCause: async function(req,res) {
        let model = await createModel(`${req.params.brand}-causes`);

        // Find the current document based on the slug
        let currentDocument = await model.findOne({ slug: req.params.slug }).lean();

        if (!currentDocument) {
            return res.status(404).json({ message: 'Document not found' });
        };

        currentDocument.number = currentDocument.bannerImg.split("/image/upload/")[1].split("/dedicatedparents/")[0];
        currentDocument.imgSlug = currentDocument.bannerImg.split("/causes-photos/")[1];

        // Find the next document (using _id for simplicity, assuming it's auto-incremented or timestamped)
        let nextDocument = await model.findOne({ _id: { $gt: currentDocument._id } }).sort({ _id: 1 }).lean();

        // Find the previous document
        let prevDocument = await model.findOne({ _id: { $lt: currentDocument._id } }).sort({ _id: -1 }).lean();

        // If no next document is found, fetch the first document (wrap around)
        if (!nextDocument) {
            nextDocument = await model.findOne().sort({ _id: 1 }).lean();
        };

        // If no previous document is found, fetch the last document (wrap around)
        if (!prevDocument) {
            prevDocument = await model.findOne().sort({ _id: -1 }).lean();
        };

        // Return the current, next, and previous documents
        return {
            current: currentDocument,
            next: nextDocument,
            prev: prevDocument
        };
    },

    getStaff: async function(req,res) {
        let model = await createModel(`${req.params.brand}-staffs`);

        // Find the current document based on the slug
        let currentDocument = await model.findOne({ slug: req.params.slug }).lean();

        if (!currentDocument) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // Find the next document (using _id for simplicity, assuming it's auto-incremented or timestamped)
        let nextDocument = await model.findOne({ _id: { $gt: currentDocument._id } }).sort({ _id: 1 }).lean();

        // Find the previous document
        let prevDocument = await model.findOne({ _id: { $lt: currentDocument._id } }).sort({ _id: -1 }).lean();

        // If no next document is found, fetch the first document (wrap around)
        if (!nextDocument) {
            nextDocument = await model.findOne().sort({ _id: 1 }).lean();
        }

        // If no previous document is found, fetch the last document (wrap around)
        if (!prevDocument) {
            prevDocument = await model.findOne().sort({ _id: -1 }).lean();
        }

        // Return the current, next, and previous documents
        return {
            current: currentDocument,
            next: nextDocument,
            prev: prevDocument
        };

    },

    getEvent: async function(req,res) {
        let model = await createModel(`${req.params.brand}-events`);

        // Find the current document based on the slug
        let currentDocument = await model.findOne({ slug: req.params.slug }).lean();

        if (!currentDocument) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // Find the next document (using _id for simplicity, assuming it's auto-incremented or timestamped)
        let nextDocument = await model.findOne({ _id: { $gt: currentDocument._id } }).sort({ _id: 1 }).lean();

        // Find the previous document
        let prevDocument = await model.findOne({ _id: { $lt: currentDocument._id } }).sort({ _id: -1 }).lean();

        // If no next document is found, fetch the first document (wrap around)
        if (!nextDocument) {
            nextDocument = await model.findOne().sort({ _id: 1 }).lean();
        }

        // If no previous document is found, fetch the last document (wrap around)
        if (!prevDocument) {
            prevDocument = await model.findOne().sort({ _id: -1 }).lean();
        }

        // Return the current, next, and previous documents
        return {
            current: currentDocument,
            next: nextDocument,
            prev: prevDocument
        }

    }
};

export default all_modules;