const Augur = require("augurbot"),
  Express = require("express"),
  bodyParser = require("body-parser"),
  site = require("../config/site.json"),
  fs = require("fs"),
  path = require("path"),
  session = require("express-session")(site.session);

const app = new Express();

const Module = new Augur.Module()
.setInit(() => {
  app.disable("x-powered-by");

  app.set("views", "./site/views");
  app.set("view engine", "pug");
  app.disable("view cache");

  app.use((req, res, next) => {
    res.locals.handler = Module.handler;
    res.locals.bot = Module.handler.client;
    next();
  });

  app.use(session);

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({extended: true}));

  // Load Routers
  fs.readdirSync(path.resolve(process.cwd(), "./site/private"))
  .filter(r => r.endsWith(".js"))
  .map(f => f.slice(0, -3))
  .forEach(route => {
    let router = require(path.resolve(process.cwd(), "./site/private", route));
    if (route == "root") route = "";
    app.use(`/${route}`, router);
  });

  // Default to Static
  app.use(Express.static("./site/public"));

  // 404
  app.use((req, res) => {
    res.status(404).render("error", {
      title: "Page Not Found",
      status: 404,
      error: "Page Not Found."
    });
  });

  const server = app.listen(site.port, (err) => {
    if (err) console.error(err);
    else console.log("Listening on port", site.port);
  });

})
.setUnload(() => {
  http.close();

  let routerPath = path.resolve(process.cwd(), "./site/private");
  let routers = fs.readdirSync(routerPath);
  routers = routers.filter(r => r.endsWith(".js"));

  routers.forEach(route => {
    delete require.cache[require.resolve(path.resolve(routerPath, route))];
  });

  ["./data/roles.json", "./utils/IgnInfo.js"].forEach(file => {
    delete require.cache[require.respolve(path.resolve(process.cwd(), file))];
  });
});

module.exports = Module;
