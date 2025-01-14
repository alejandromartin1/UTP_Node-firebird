const express = require("express");
const router = express.Router();

const {
  Alumno,
  Ciclos,
  Grupos,
  Niveles,
  Doctos,
  AlumnosGrupos,
  AlumKardex,
  CfgStatus,
  Planes_Mst,
  Planes_Eval,
  Planes_Det,
  Profesores,
  VillasMst,
  VillasCfg,
  ProfesoresGrupos,
} = require("../app/models");

router.get("/grupos", async (req, res) => {
  const {
    skip = 0,
    limit = 10,
    search = "",
    orderBy = "codigo_carrera",
    sort = "asc",
  } = req.query;

  // Consulta SQL paar mostrar los grupos
  let query = `SELECT FIRST(${limit}) SKIP(${skip}) `;
  query +=
    "grupos.codigo_grupo as codigo_grupo, grupos.grado, grupos.grupo as grupo, grupos.cupo_maximo, grupos.inscritos, profesores.nombreprofesor as claveprofesor_titular, cfgniveles.nivel as codigo_carrera ";
  query += "FROM grupos ";
  query +=
    "LEFT JOIN profesores ON grupos.claveprofesor_titular = profesores.claveprofesor ";
  query += "JOIN cfgniveles ON grupos.nivel = cfgniveles.nivel ";

  // Si hay palabras a bsucar, lo agrega en la consulta
  if (search.length > 0) {
    query += `WHERE (grupos.codigo_grupo LIKE '%${search.toLocaleUpperCase()}%') `;
  }

  // Si hay periodo seleccionado a mostrar lo agrega en la query
  if (req.session.periodoSelected) {
    let periodo = await Ciclos.findById(req.session.periodoSelected);
    // Valida si ya tiene la consulta WHERE
    query += query.includes("WHERE") ? "AND" : "WHERE";
    // si lo tiene agrega un AND,  si no, agrega el WHERE
    query += ` grupos.inicial = ${periodo?.INICIAL} `;
    query += `AND grupos.final = ${periodo?.FINAL} `;
    query += `AND grupos.periodo = ${periodo?.PERIODO} `;
  }

  // Codigo para ordenar si existe
  query += `ORDER BY ${orderBy} ${sort}`;

  const grupos = await Grupos.createQuery({ querySql: query });

  res.json({
    querys: {
      limit,
      skip,
      search,
      orderBy,
      sort
    },
    periodoSelected: req.session.periodoSelected,
    grupos,
  });
});

router.get("/grupos_alumnos/:idGrupo", async (req, res) => {
  const { limit = 10, skip = 0 } = req.query;
  const idGrupo = req.params.idGrupo;

  let sql = `SELECT FIRST(${limit}) SKIP(${skip}) `;
  sql += `alumnos.matricula, alumnos.paterno, alumnos.materno, alumnos.nombre, alumnos.nivel, alumnos.genero, alumnos.status `;
  sql += "FROM alumnos_grupos ";
  sql +=
    "left join alumnos on alumnos_grupos.numeroalumno = alumnos.numeroalumno ";
  sql += `where codigo_grupo = '${idGrupo}' `;

  // Si hay periodo seleccionado a mostrar lo agrega en la query
  if (req.session.periodoSelected) {
    let periodo = await Ciclos.findById(req.session.periodoSelected);

    sql += `AND alumnos_grupos.inicial = ${periodo?.INICIAL} `;
    sql += `AND alumnos_grupos.final = ${periodo?.FINAL} `;
    sql += `AND alumnos_grupos.periodo = ${periodo?.PERIODO} `;
  }

  // Ordena la tabla por apellidos en orden alfabetico
  sql += `order by alumnos.paterno asc`;

  const alumnos = await AlumnosGrupos.createQuery({ querySql: sql });

  res.json({
    querys: {
      limit,
      skip
    },
    idGrupo,
    alumnos,
  });
});

router.get("/cuatris-navbar", async (req, res) => {
  const { limit = 100 } = req.query;

  const ciclos = await Ciclos.all({
    limit,
  });

  let periodoSelected = await Ciclos.findById(req.session.periodoSelected);

  res.json({
    periodoSelected: periodoSelected?.DESCRIPCION,
    ciclos,
  });
});

router.put("/update/CuatriXGrupos", async (req, res) => {
  const { periodo } = req.body;

  // Actualiza el periodo a mostrar en la API de grupos
  if (periodo === "none") {
    req.session.periodoSelected = null;
  } else {
    req.session.periodoSelected = periodo;
  }

  res.json({
    res: "Periodo actualizado",
  });
});

// Cuatrimestres / Ciclos
router.get("/cuatrimestres", async (req, res) => {
  const { limit, skip, search } = req.query;

  let searchQuery = "";

  if (search) {
    searchQuery = `(codigo_corto LIKE '%${search.toUpperCase()}%') `;
    searchQuery += `OR (descripcion LIKE '%${search}%')`;
  }

  const ciclos = await Ciclos.all({
    limit,
    skip,
    searchQuery,
    orderBy: 'inicial',
    sort: 'desc'
  });

  res.json({
    querys: {
      limit,
      skip,
      search
    },
    ciclos,
  });
});

router.get("/alumnos", async (req, res) => {
  const { limit = 15, skip = 0, search, orderBy = "paterno", sort ="asc" } = req.query;

  let searchQuery = null;

  // Si hay palabras a buscar, lo agrega en la consulta
  if (search) {
    searchQuery = `(matricula LIKE '%${search}%') `;
    searchQuery += `OR (nombre LIKE '%${search}%') `;
    searchQuery += `OR (paterno LIKE '%${search}%') `;
    
    let searchLastName = search.split(" ");
    if(searchLastName.length > 1) {
      searchQuery += `OR (paterno LIKE '%${searchLastName[0]}%' AND materno LIKE '%${searchLastName[1]}%') `;
    }
  }

  const alumnos = await Alumno.all({
    limit,
    skip,
    searchQuery,
    orderBy,
    sort,
  });

  res.json({
    querys: {
      limit,
      skip,
      search,
      orderBy,
      sort
    },
    alumnos,
  });
});

router.get("/carreras", async (req, res) => {
  const { limit, skip, search } = req.query;

  let searchQuery = null;

  if (search) {
    searchQuery = `descripcion LIKE '%${search}%'`;
  }

  const niveles = await Niveles.all({
    limit,
    skip,
    searchQuery,
    orderBy: "descripcion",
  });

  res.json({
    querys: {
      limit,
      skip,
      search
    },
    niveles,
  });
});

router.get("/doctos/", async (req, res) => {
  const { grado, numalumno } = req.query;

  if(!grado || !numalumno) {
    return res.json({
      error: 'Se necesita el grado a buscar y el numero del alumno'
    });
  }

  const doctos = await Doctos.where({
    grado: [grado],
    clave: [numalumno]
  }, {
    strict: true,
  });

  res.json({
    query: {
      grado,
      numalumno
    },
    doctos,
  });
});

router.get("/calificaciones/asignaturas", async (req, res) => {
  const { idPlan = "", idAsig = "", idEval = "", idGrupo = "" } = req.query;

  if(!idGrupo || !idPlan || !idAsig || !idEval) {
    return res.json({
      error: "El id del grupo, plan, evaluacion y asignatura son necesarios",
      querys: {
        idPlan,
        idAsig,
        idEval,
        idGrupo,
      }
    })
  };

  try {

    let grupo = await Grupos.findById(idGrupo);

    let data = await AlumKardex.where({
      id_plan: [idPlan],
      id_eval: [idEval],
      claveasignatura: [idAsig],
      inicial: [grupo.INICIAL],
      final: [grupo.FINAL],
      // periodo: [grupo.PERIODO],
    }, { limit: 35 });
    
    res.json({
      querys: {
        idPlan,
        idAsig,
        idEval,
        idGrupo,
      },
      data,
    });

  } catch (error) {
    res.json({
      error: "El id del grupo y el plan no coinciden para la consulta"
    })
  }
});

// Api para consultar calificaciones por grupos
router.get("/calificaciones", async (req, res) => {
  const { 
    idPlan,
    grupo,
    claveAsig,
    idEtapa,
    idEval = "A", 
    inicial, 
    final, 
    periodo,    
  } = req.query;

  if(!idPlan || !claveAsig) {
    return res.json({
      error: "Hace faltan datos para la operación"
    });
  };

  try {

    let plan = await Planes_Mst.findById(idPlan);

    if(!plan) {
      return res.json({
        error: "No existe el plan"
      });
    }

    let sql = `
      select alumnos.matricula,
        alumnos.numeroalumno,
        alumnos.nombre,
        alumnos.paterno,
        alumnos.materno,
        alumnos_kardex.calificacion,
        alumnos_kardex.id_eval,
        alumnos_kardex.id_plan

      from alumnos_kardex

      inner join alumnos on alumnos_kardex.numeroalumno = alumnos.numeroalumno
      inner join alumnos_grupos on alumnos_kardex.numeroalumno = alumnos_grupos.numeroalumno
        and alumnos_kardex.inicial = alumnos_grupos.inicial
        and alumnos_kardex.final = alumnos_grupos.final
        and alumnos_kardex.periodo = alumnos_grupos.periodo

      where alumnos_kardex.id_plan = '${idPlan}'
        and alumnos_kardex.claveasignatura = '${claveAsig}'
        and alumnos_kardex.id_etapa = '${idEtapa}'
        and alumnos_kardex.id_eval = '${idEval}'
        and alumnos_kardex.inicial = '${inicial}'
        and alumnos_kardex.final = '${final}'
        and alumnos_kardex.periodo = '${periodo}'
        and alumnos_grupos.codigo_grupo = '${grupo}'

      order by paterno`;

    let data = await Grupos.createQuery({ querySql: sql });
    
    res.json({
      querys: {
        idPlan,
        grupo, 
        claveAsig,
        idEtapa,
        idEval, 
        inicial, 
        final, 
        periodo, 
      },
      data,
    });

  } catch (error) {
    res.json({
      error: "Algunos datos no coinciden para la consulta",
      querys: req.query
    })
  }
});

// Api para subir calificaciones
router.post("/calificaciones", (req, res) => {

  const {
    claveAsig,
    idEtapa,
    idPlan,
    idEval,
    inicial,
    final,
    periodo
  } = req.query;

  const dataCalif = req.body;
  let promises = [];

  for (const key in dataCalif) {
    let sql = `UPDATE alumnos_kardex SET calificacion = ?
      WHERE numeroalumno = ? 
        and claveasignatura = '${claveAsig}' 
        and id_plan = '${idPlan}'
        and id_eval = '${idEval}'
        and id_etapa = '${idEtapa}'
        and inicial = ${inicial} 
        and final = ${final}
        and periodo = ${periodo}`;

    promises.push(AlumKardex.createQuery({
      querySql: sql,
      data: [dataCalif[key], key],
    }));
  }

  Promise.all(promises).then(() => {
    res.json({
      msj: "Datos actualizados correctamente",
    })
  })
});

router.get("/planes", async (req, res) => {
  const { 
    page = 1, 
    search = '',
    nivel = ''
  } = req.query;

  let searchQuery = '';

  if (page <= 0) page = 1;

  if (search) {
    searchQuery += `nombre_plan LIKE '%${search.toUpperCase()}%'`
  }

  if (nivel) {
    if(search) searchQuery += ' AND '
    searchQuery += `nivel = '${nivel}'`
  }

  const planes = await Planes_Mst.all({
    limit: 20,
    skip: (page - 1) * 20,
    searchQuery,
    orderBy: 'nombre_plan',
    sort: 'asc',
  });

  res.json({
    query: {
      page,
      search,
      nivel
    },
    data: planes
  })

});

router.get("/planes/:idPlan/asig", async (req, res) => {
  const { idPlan = "" } = req.params;
  const asigs = await Planes_Det.where(
    { 
      id_plan: [idPlan], 
      id_tipoeval: ["A"],
    },
    { strict: true, limit: 50 }
  );

  res.json({
    querys: null,
    data: asigs
  });
});

router.get("/planes/:idPlan/eval", async (req, res) => {
  const { idPlan } = req.params;
  const evals = await Planes_Eval.where(
    { id_plan: [idPlan] },
    { strict: true }
  );

  res.json({
    querys: null,
    data: evals
  })
});

// Calificaciones por alumno
router.get("/calificaciones/:numalumno", async (req, res) => {
  const { cuatri = 1, eval = "A" } = req.query;
  const alumno = req.params.numalumno;

  let sql = `select first(30)
    alumnos_kardex.numeroalumno,
    alumnos_kardex.claveasignatura,
    cfgplanes_det.nombreasignatura,
    alumnos_kardex.id_plan,
    alumnos_kardex.id_eval,
    alumnos_kardex.calificacion
  from alumnos_kardex
  join cfgplanes_det on alumnos_kardex.claveasignatura = cfgplanes_det.claveasignatura
    and alumnos_kardex.id_plan = cfgplanes_det.id_plan
    and alumnos_kardex.id_etapa = cfgplanes_det.id_etapa
  where (alumnos_kardex.numeroalumno = ${alumno})
    and (alumnos_kardex.id_eval = '${eval}')
    and (cfgplanes_det.grado = ${cuatri})`;

  const data = await AlumKardex.createQuery({
    querySql: sql
  })

  res.json({
    query: {
      cuatri,
      eval
    },
    data
  })

});

router.get("/estatus", async (req, res) => {
  const { search = "" } = req.query;

  let searchQuery = null;
  if (search) {
    searchQuery = `descripcion LIKE '%${search}%'`;
  }

  const status = await CfgStatus.all({
    limit: 50,
    searchQuery,
  })

  res.json({
    querys: search,
    data: status
  })
});

router.get("/profesores", async (req, res) => {
  const { search = "", page = 1 } = req.query;

  let searchQuery = "";

  if (search) {
    searchQuery += `nombreprofesor like '%${search}%'`;
  }

  const profes = await Profesores.all({
    searchQuery,
    limit: 20,
    skip: (page - 1) * 20,
  });

  res.json({
    query: {
      search,
      page
    },
    data: profes
  })

});

router.get("/profesores/:id/grupos", async (req, res) => {
  const idProfesor = req.params.id;

  const { page = 1 } = req.query;

  if (page <= 0) page = 1;
  
  let sql = `select first(${page * 20}) skip(${(page - 1) * 20}) *
    from profesores_grupos
    join cfgplanes_det as asig
    on profesores_grupos.id_plan = asig.id_plan
    and profesores_grupos.id_etapa = asig.id_etapa
    and profesores_grupos.claveasignatura = asig.claveasignatura
    where claveprofesor = '${idProfesor}' `;

  let periodoSelected = req.session.periodoSelected;

  if (periodoSelected) { 
    let ciclos = await Ciclos.findById(periodoSelected);
    sql += `and inicial = ${ciclos.INICIAL} `;
    sql += `and final = ${ciclos.FINAL} `;
    sql += `and periodo = ${ciclos.PERIODO} `;
  }

  let grupos = await ProfesoresGrupos.createQuery({ querySql: sql });

  res.json({
    id_profesor: idProfesor,
    data: grupos,
  })

});

router.get("/villas", async (req, res) => {
  let villa = await VillasMst.all({
    limit: 10,
  })
  res.json(villa);
});

router.get("/villas/:id", async (req, res) => {
  let villa = await VillasMst.findById(req.params.id);
  res.json(villa);
});

router.get("/villas/:idVilla/cfg", async (req, res) => {
  let cfgVilla = await VillasCfg.where({
    codigo_villa: [req.params.idVilla]
  },
  {
    limit: 10,
  });

  res.json(cfgVilla);
});

router.get("/villas/:idVilla/cfg/:idCfg", async (req, res) => {});

module.exports = router;
