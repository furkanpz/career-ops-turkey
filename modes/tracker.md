# Modo: tracker — Tracker de Aplicaciones

Lee y muestra `data/applications.md`.

**Formato del tracker:**
```markdown
| # | Fecha | Empresa | Rol | Score | Estado | PDF | Report |
```

Estados posibles: `EVALUATED` → `APPLIED` → `RESPONSE_RECEIVED` → `INTERVIEW` → `OFFER` / `REJECTED` / `DISCARDED` / `SKIP`

- `APPLIED` = el candidato envió su candidatura
- `RESPONSE_RECEIVED` = hubo una respuesta de la empresa, pero aún no está claramente en fase de entrevista
- `INTERVIEW` = proceso de entrevista activo

Si el usuario pide actualizar un estado, editar la fila correspondiente.

Mostrar también estadísticas:
- Total de aplicaciones
- Por estado
- Score promedio
- % con PDF generado
- % con report generado
