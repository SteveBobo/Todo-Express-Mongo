# Todo App - Express.js and MongoDB

The API uses Express.js and Mongoose API to connect to MongoDB. 


| Endpoints| Actions | Intended Outcome                                    |
|----------|---------|-----------------------------------------------------|
| users    | GET     | Respond with a List of users                        |
|          | POST    | Create a new user. Respond with details of new user |
| users/:id| GET     | Respond with details of specified user or 404 error |
|          | PUT     | Replace entire user with supplied user or 404 error |
|          | DELETE  | Delete specified user or 404 error                  |
| tasks    | GET     | Respond with a List of tasks                        |
|          | POST    | Create a new task. Respond with details of new task |
| tasks/:id| GET    | Respond with details of specified task or 404 error  |
|          | PUT     | Replace entire task with supplied task or 404 error |
|          | DELETE  | Delete specified user or 404 error                  |


| Parameter | Description                                                                                  |
|----------|----------------------------------------------------------------------------------------------|
| where    | filter results based on JSON query                                                           |
| sort     | specify the order in which to sort each specified field  (1- ascending; -1 - descending)     |
| select   | specify the set of fields to include or exclude in each document  (1 - include; 0 - exclude) |
| skip     | specify the number of results to skip in the result set; useful for pagination               |
| limit    | specify the number of results to return (default should be 100 for tasks and unlimited for users)                    |
| count    | if set to true, return the count of documents that match the query (instead of the documents themselves)                    |

Here are some example queries and what they would return:

| Query                                                                                | Description                                             |
|-----------------------------------------------------------------------------------------|---------------------------------------------------------|
| `http://localhost:4000/api/tasks`                          | Returns full list of  tasks                       |
| `http://localhost:4000/api/users`                          | Returns full list of users                       |
| `http://localhost:4000/api/users?where={"_id": "55099652e5993a350458b7b7"}`         | Returns a list with a single user with the specified ID ('_id' will be different) |
| `http://localhost:4000/api/tasks?where={"completed": true}`                          | Returns a list of completed tasks                       |
| `http://localhost:4000/api/tasks?where={"_id": {"$in": ["59f930d6b1596b0cb3e82953","5a1b6d7bd72ba9106fe9239c"]}}` | Returns a set of tasks                                  |
| `http://localhost:4000/api/users?sort={"name": 1}`                                  | Returns a list of users sorted by name                  |
| `http://localhost:4000/api/users?select={"_id": 0}`                                  | Returns a list of users without the _id field           |
| `http://localhost:4000/api/tasks?skip=60&limit=20`                                   | Returns tasks number from 61 to 80                            |

Here is the User Schema:

1. "name" - String
2. "email" - String
3. "pendingTasks" - [String] - The \_id fields of the *pending* tasks that this user has
4. "dateCreated" - Date - should be set automatically by server

Here is the Task Schema:

1. "name" - String
2. "description" - String
3. "deadline" - Date
4. "completed" - Boolean
5. "assignedUser" - String - The \_id field of the user this task is assigned to - default ""
6. "assignedUserName" - String - The name field of the user this task is assigned to - default "unassigned"
7. "dateCreated" - Date - should be set automatically by server to present date

**Each task can be assigned only to one user.**
