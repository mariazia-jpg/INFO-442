import { useEffect, useState } from 'react';
import { loadCheckedMaterials, saveCheckedMaterials } from '../services/materials.js';

/** Materials for a project as a checklist the user can tick off while gathering them. */
export default function MaterialsChecklist({ projectId, materials }) {
  const [checked, setChecked] = useState(() => loadCheckedMaterials(projectId, materials));

  useEffect(() => {
    setChecked(loadCheckedMaterials(projectId, materials));
  }, [projectId, materials]);

  function toggle(material) {
    const next = checked.includes(material)
      ? checked.filter((name) => name !== material)
      : [...checked, material];
    setChecked(next);
    saveCheckedMaterials(projectId, next);
  }

  const done = checked.length === materials.length;

  return (
    <section aria-labelledby="materials-heading">
      <h2 id="materials-heading">Materials</h2>
      <p className="muted small" id="materials-hint">Tick off each item once you have it.</p>
      <ul className="checklist" aria-describedby="materials-hint">
        {materials.map((material, index) => {
          const id = `material-${index}`;
          return (
            <li key={material}>
              <input
                type="checkbox"
                id={id}
                checked={checked.includes(material)}
                onChange={() => toggle(material)}
              />
              <label htmlFor={id}>{material}</label>
            </li>
          );
        })}
      </ul>
      <p className="checklist-count" aria-live="polite">
        {done ? 'You have everything you need.' : `${checked.length} of ${materials.length} ready`}
      </p>
    </section>
  );
}
