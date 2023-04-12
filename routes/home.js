var secrets = require('../config/secrets');
const User = require('../models/user')
const Task = require('../models/task')

module.exports = function (router) {

    var homeRoute = router.route('/');
    var usersRoute = router.route('/users');
    var userRoute = router.route('/users/:id');
    var tasksRoute = router.route('/tasks');
    var taskRoute = router.route('/tasks/:id');

    homeRoute.get(function (req, res) {
        var connectionString = secrets.token;
        res.json({ message: 'My connection string is ' + connectionString });
    });

    usersRoute.get(async function (req, res, next) {
        let queryParams = {
            where: {},
            sort: '',
            select: '_id name email pendingTasks dateCreated',
            skip: 0,
            limit: '',
            count: false
        }
        try {
            parseParams(queryParams, req);
            if (queryParams.count) {
                const userCount = await User.find().skip(queryParams.skip).limit(queryParams.limit)
                    .countDocuments(queryParams.where);
                res.status(200).send({ 'message': 'OK', 'data': { 'user count': userCount } });
            } else {
                const users = await User.find(queryParams.where).select(queryParams.select)
                    .sort(queryParams.sort).skip(queryParams.skip).limit(queryParams.limit);
                res.status(200).send({ 'message': 'OK', 'data': users });
            }
        } catch (err) {
            next(err);
            res.status(500).send({ 'message': 'Get Users Request Failed', 'data': {} });
        }
    });

    usersRoute.post(async function (req, res, next) {
        try {
            const user = new User({
                name: req.body.name,
                email: req.body.email
            });
            if ('pendingTasks' in req.body) {
                let index = 0;
                    try {
                        for(let i = 0; i < req.body.pendingTasks.length; i++) {
                            index = i;
                            const task = await Task.findById(req.body.pendingTasks[i]);
                            if(task === null) {
                                return res.status(404).send({ 'message': 'Invalid Request. \'' + req.body.pendingTasks[index] + '\' Is Not A Valid Task', 'data': {} });
                            }
                        }
                    } catch {
                        return res.status(404).send({ 'message': 'Invalid Request. \'' + req.body.pendingTasks[index] + '\' Is Not A Valid Task', 'data': {} });
                    }
                    user.pendingTasks = req.body.pendingTasks;
                    for(let i = 0; i < user.pendingTasks.length; i++) {
                        updateTaskUser(user.pendingTasks[i], user._id, user.name);
                    }
            }
            user.save((err) => {
                if (err) {
                    next(err);
                    if (err.code === 11000) {
                        res.status(409).send({ 'message': 'Email Address Already Exists', 'data': { 'email': user.email } });
                    } else if ('errors' in err) {
                        const errField = Object.keys(err.errors);
                        res.status(400).send({ 'message': 'Invalid Request. Check \'' + errField[0] + '\' Field And Try Again', 'data': {} });
                    } else {
                        res.status(400).send({ 'message': 'Invalid Request', 'data': {} });
                    }
                } else {
                    res.status(201).send({
                        'message': 'User Successfully Created', 'data': {
                            '_id': user._id, 'email': user.email,
                            'name': user.name, 'pendingTasks': user.pendingTasks, 'dateCreated': user.dateCreated
                        }
                    });
                }
            });
        } catch (err) {
            next(err);
            res.status(500).send({ 'message': 'Create User Request Failed', 'data': {} });
        }
    });

    userRoute.get(async function (req, res, next) {
        try {
            try {
                const user = await User.findById(req.params.id);
                res.status(200).send({
                    'message': 'OK', 'data': {
                        '_id': user._id, 'email': user.email,
                        'name': user.name, 'pendingTasks': user.pendingTasks, 'dateCreated': user.dateCreated
                    }
                });
            } catch {
                res.status(404).send({ 'message': 'User Not Found', 'data': {} })
            }
        } catch (err) {
            next(err);
            res.status(500).send({ 'message': 'Get User Request Failed', 'data': {} });
        }
    });

    userRoute.put(async function (req, res, next) {
        try {
            try {
                const user = await User.findById(req.params.id);
                if ('name' in req.body) {
                    user.name = req.body.name;
                    if(user.pendingTasks.length > 0) {
                        for(let i = 0; i < user.pendingTasks.length; i++) {
                            const task = await Task.findById(user.pendingTasks[i]);
                            task.assignedUserName = user.name;
                            updateTaskUser(user.pendingTasks[i], user._id, user.name);
                        }
                    }
                }
                if ('pendingTasks' in req.body) {
                    let previousTasks = user.pendingTasks;
                    let index = 0;
                    try {
                        for(let i = 0; i < req.body.pendingTasks.length; i++) {
                            index = i;
                            const task = await Task.findById(req.body.pendingTasks[i]);
                            if(task === null) {
                                return res.status(404).send({ 'message': 'Invalid Request. \'' + req.body.pendingTasks[index] + '\' Is Not A Valid Task', 'data': {} });
                            }
                        }
                    } catch {
                        return res.status(404).send({ 'message': 'Invalid Request. \'' + req.body.pendingTasks[index] + '\' Is Not A Valid Task', 'data': {} });
                    }
                    user.pendingTasks = req.body.pendingTasks;
                    for(let i = 0; i < user.pendingTasks.length; i++) {
                        updateTaskUser(user.pendingTasks[i], user._id, user.name);
                    }
                    for(let i = 0; i < previousTasks.length; i++) {
                        if(!(user.pendingTasks.includes(previousTasks[i]))) {
                            updateTaskUser(previousTasks[i], '', 'unassigned');
                        }
                    }
                }
                if ('email' in req.body) {
                    user.email = req.body.email;
                }
                user.save((err) => {
                    if (err) {
                        next(err);
                        if (err.code === 11000) {
                            res.status(409).send({ 'message': 'Email Address Already Exists', 'data': { 'email': user.email } });
                        } else if ('email' in err.errors) {
                            res.status(400).send({'message': 'Invalid Email Address', 'data': {}});
                        } else if ('name' in err.errors) {
                            res.status(400).send({'message': 'Invalid Name', 'data': {}});
                        } else if ('errors' in err) {
                            const errField = Object.keys(err.errors);
                            res.status(400).send({ 'message': 'Invalid Request. Check \'' + errField[0] + '\' Field And Try Again', 'data': {} });
                        } else {
                            res.status(400).send({ 'message': 'Invalid Request', 'data': {} });
                        }
                    } else {
                        res.status(200).send({
                            'message': 'User Successfully Updated', 'data': {
                                '_id': user._id, 'email': user.email,
                                'name': user.name, 'pendingTasks': user.pendingTasks, 'dateCreated': user.dateCreated
                            }
                        });
                    }
                });
            } catch {
                res.status(404).send({ 'message': 'User Not Found', 'data': {} })
            }
        } catch (err) {
            next(err);
            res.status(500).send({ 'message': 'Update User Request Failed', 'data': {} });
        }
    });

    userRoute.delete(async function (req, res, next) {
        try {
            try {
                const user = await User.findById(req.params.id);
                for(let i = 0; i < user.pendingTasks.length; i++) {
                    updateTaskUser(user.pendingTasks[i], '', 'unassigned');
                }
                await User.deleteOne({ _id: user.id });
                res.status(200).send({ 'message': 'User Successfully Deleted', 'data': { '_id': req.params.id } });
            } catch {
                res.status(404).send({ 'message': 'User Not Found', 'data': {} })
            }
        } catch (err) {
            next(err);
            res.status(500).send({ 'message': 'Delete User Request Failed', 'data': {} });
        }
    });

    tasksRoute.get(async function (req, res, next) {
        let queryParams = {
            where: {},
            sort: '',
            select: 'name description deadline completed assignedUser assignedUserName dateCreated',
            skip: 0,
            limit: '',
            count: false
        }
        try {
            parseParams(queryParams, req)
            if (queryParams.count) {
                const taskCount = await Task.find().skip(queryParams.skip).limit(queryParams.limit)
                    .countDocuments(queryParams.where);
                res.status(200).send({ 'message': 'OK', 'data': { 'task count': taskCount } });
            } else {
                const tasks = await Task.find(queryParams.where).select(queryParams.select)
                    .sort(queryParams.sort).skip(queryParams.skip).limit(queryParams.limit);
                res.status(200).send({ 'message': 'OK', 'data': tasks });
            }
        } catch (err) {
            next(err);
            res.status(500).send({ 'message': 'Get Tasks Request Failed', 'data': {} });
        }
    });

    tasksRoute.post(async function (req, res, next) {
        try {
            const task = new Task({
                name: req.body.name,
                deadline: req.body.deadline
            });
            if ('description' in req.body) {
                task.description = req.body.description;
            }
            if ('assignedUser' in req.body) {
                task.assignedUser = req.body.assignedUser;
            }
            if ('assignedUserName' in req.body) {
                task.assignedUserName = req.body.assignedUserName;
            }
            if ('completed' in req.body) {
                task.completed = req.body.completed;
            }
            task.save((err) => {
                if (err) {
                    next(err);
                    if ('deadline' in err.errors) {
                        res.status(400).send({ 'message': '\'deadline\' Must Be Valid Date', 'data': {} });
                    } else if ('errors' in err) {
                        const errField = Object.keys(err.errors);
                        res.status(400).send({ 'message': 'Invalid Request. Check \'' + errField[0] + '\' Field And Try Again', 'data': {} });
                    } else {
                        res.status(400).send({ 'message': 'Invalid Request', 'data': {} });
                    }
                } else {
                    if(task.completed === false && task.assignedUser !== '') {
                        addPendingTask(task.assignedUser, task._id);
                    }
                    res.status(201).send({
                        'message': 'Task Successfully Created', 'data': {
                            '_id': task._id, 'name': task.name,
                            'description': task.description, 'deadline': task.deadline, 'completed': task.completed,
                            'assignedUser': task.assignedUser, 'assignedUserName': task.assignedUserName, 'dateCreated': task.dateCreated
                        }
                    });
                }
            });
        } catch (err) {
            next(err);
            res.status(500).send({ 'message': 'Create Task Request Failed', 'data': {} });
        }

    });

    taskRoute.get(async function (req, res, next) {
        try {
            try {
                const task = await Task.findById(req.params.id);
                res.status(200).send({
                    'message': 'OK', 'data': {
                        '_id': task._id, 'name': task.name,
                        'description': task.description, 'deadline': task.deadline, 'completed': task.completed,
                        'assignedUser': task.assignedUser, 'assignedUserName': task.assignedUserName, 'dateCreated': task.dateCreated
                    }
                });
            } catch {
                res.status(404).send({ 'message': 'Task Not Found', 'data': {} })
            }
        } catch (err) {
            next(err);
            res.status(500).send({ 'message': 'Get Task Request Failed', 'data': {} });
        }
    });

    taskRoute.put(async function (req, res, next) {
        try {
            try {
                const task = await Task.findById(req.params.id);
                if ('name' in req.body) {
                    task.name = req.body.name;
                }
                if ('description' in req.body) {
                    task.description = req.body.description;
                }
                if ('deadline' in req.body) {
                    task.deadline = req.body.deadline;
                }
                if ('completed' in req.body) {
                    task.completed = req.body.completed;
                }
                if ('assignedUser' in req.body) {
                    var previousUser = task.assignedUser;
                    if(req.body.assignedUser === '' && task.assignedUser === '') {
                        return res.status(409).send({ 'message': 'Task is already unassigned', 'data': {} });
                    } else {
                        task.assignedUser = req.body.assignedUser;
                        task.assignedUserName = 'unassigned';
                    }  
                }
                if ('assignedUserName' in req.body) {
                    if (task.assignedUser === '') {
                        task.assignedUserName = 'unassigned';
                    } else {
                        task.assignedUserName = req.body.assignedUserName;
                    }
                }
                task.save((err) => {
                    if (err) {
                        next(err);
                        if ('deadline' in err.errors) {
                            res.status(400).send({ 'message': '\'deadline\' Must Be Valid Date', 'data': {} });
                        } else if ('completed' in err.errors) {
                            res.status(400).send({ 'message': '\'completed\' Must Be \'true\' or \'false\'', 'data': {} });
                        } else if ('errors' in err) {
                            const errField = Object.keys(err.errors);
                            res.status(400).send({ 'message': 'Invalid Request. Check \'' + errField[0] + '\' Field And Try Again', 'data': {} });
                        } else {
                            res.status(400).send({ 'message': 'Invalid Request', 'data': {} });
                        }
                    } else {
                        if(task.completed === true && task.assignedUser !== '') {
                            removePendingTask(task.assignedUser, task._id)
                        } else if (('completed' in req.body && task.completed === false) || 
                            ('assignedUser' in req.body && task.assignedUser !== '')) {
                            addPendingTask(task.assignedUser, task._id)
                        } else if ('assignedUser' in req.body && task.assignedUser === '') {
                            removePendingTask(previousUser, task._id);
                        }
                        res.status(200).send({
                            'message': 'Task Successfully Updated', 'data': {
                                '_id': task._id, 'name': task.name,
                                'description': task.description, 'deadline': task.deadline, 'completed': task.completed,
                                'assignedUser': task.assignedUser, 'assignedUserName': task.assignedUserName, 'dateCreated': task.dateCreated
                            }
                        });
                    }
                });
            } catch {
                res.status(404).send({ 'message': 'Task Not Found', 'data': {} })
            }
        } catch (err) {
            next(err);
            res.status(500).send({ 'message': 'Update Task Request Failed', 'data': {} });
        }
    });

    taskRoute.delete(async function (req, res, next) {
        try {
            try {
                const task = await Task.findById(req.params.id);
                if(task.assignedUser !== '') {
                    removePendingTask(task.assignedUser, task._id)
                }
                await Task.deleteOne({ _id: task.id });
                res.status(200).send({ 'message': 'Task Successfully Deleted', 'data': { '_id': req.params.id } });
            } catch {
                res.status(404).send({ 'message': 'Task Not Found', 'data': {} })
            }
        } catch (err) {
            next(err);
            res.status(500).send({ 'message': 'Delete Task Request Failed', 'data': {} });
        }
    });

    function parseParams(paramsObject, req) {
        if ('where' in req.query) {
            paramsObject.where = JSON.parse(req.query.where);
        }
        if ('sort' in req.query) {
            paramsObject.sort = JSON.parse(req.query.sort);
        }
        if ('select' in req.query) {
            paramsObject.select = JSON.parse(req.query.select);
        }
        if ('skip' in req.query) {
            paramsObject.skip = JSON.parse(req.query.skip);
        }
        if ('limit' in req.query) {
            paramsObject.limit = JSON.parse(req.query.limit);
        }
        if ('count' in req.query) {
            paramsObject.count = JSON.parse(req.query.count);
        }
    }

    async function addPendingTask(userID, taskID) {
        const user = await User.findById(userID);
        if(!(user.pendingTasks.includes(taskID))) {
            user.pendingTasks.push(taskID);
            await User.updateOne({ _id: userID}, {pendingTasks: user.pendingTasks});
        }
    }
    
    async function removePendingTask(userID, taskID) {
        const user = await User.findById(userID);
        if(user !== null) {
            const taskIndex = user.pendingTasks.indexOf(taskID);
            if(taskIndex > -1) {
                user.pendingTasks.splice(taskIndex, 1);
                user.save();
            }
        }  
    }

    async function updateTaskUser(taskID, userID, userName) {
        const task = await Task.findById(taskID);
        if(task !== null) {
            task.assignedUser = userID;
            task.assignedUserName = userName;
            task.save();
        }
    }

    return router;
}
