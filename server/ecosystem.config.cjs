module.exports = {
    apps: [
        {
            name: "huadao-contact-api",
            script: "src/server.js",
            cwd: "/var/www/huadao-contact-api",
            instances: 1,
            exec_mode: "fork",
            env: {
                NODE_ENV: "production"
            }
        }
    ]
};
