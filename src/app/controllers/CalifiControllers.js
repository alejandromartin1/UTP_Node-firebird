const { request, response } = require("express");

const CalifiCtr = {}

CalifiCtr.show = (req = request, res = response) => {
    res.render("admin/academico/calificaciones/califi", {
        codigo_grupo: req.params.idGrupo
    });
}

module.exports = {
    CalifiCtr
};