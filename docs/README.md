# Math notes

The mathematics behind each stage of the animation, in the order the
animation uses it. Formulas are written in LaTeX; GitHub renders them inline.

| Document                       | What it covers                                                                                                                      | Code                                             |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| [ncube.md](ncube.md)           | The n-cube: $2^n$ vertices, $n\,2^{n-1}$ edges, the two-copies recursion and the "corner placement" framing                         | `src/geometry/ncube.js`                          |
| [rotation.md](rotation.md)     | Rotation in n dimensions: Givens rotations in a coordinate plane, composition, why rotation is "in a plane", not "about an axis"    | `src/geometry/rotation.js`                       |
| [projection.md](projection.md) | Projecting $\mathbb{R}^n \to \mathbb{R}^3$: perspective division per extra dimension, orthographic shadows, what Three.js then does | `src/geometry/projection.js`                     |
| [collapse.md](collapse.md)     | The collapse as a dimensional projection; why the steps are discrete; what colour and brightness encode                             | `src/scene/frame.js`, `src/timeline/sequence.js` |
| [net.md](net.md)               | How the tesseract net (eight cubes) is constructed and folded back up                                                               | `src/geometry/net.js`                            |

Notation: axes are named $x, y, z, w, v, u, t$ for indices $0 \dots 6$. The
cube is always $[-1, 1]^n$. Vectors are columns; matrices act on the left.
