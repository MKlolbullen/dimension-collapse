# Rotation in n dimensions

## Rotations happen in planes, not about axes

In three dimensions we say "rotate about the $z$ axis", but what actually
moves is the $xy$ _plane_; $z$ is just the one direction left over. In
$n$ dimensions there is no single leftover direction, so the honest
description is: a rotation is a motion in a 2-plane that leaves the plane's
orthogonal complement fixed. The simplest case is a **coordinate plane**
spanned by two basis vectors $e_i, e_j$.

## The Givens rotation

The rotation by angle $\theta$ in the $(i, j)$ coordinate plane of
$\mathbb{R}^n$ is the identity matrix with four entries replaced:

$$
G_{ij}(\theta) =
\begin{pmatrix}
1 & & & & \\
 & \cos\theta & \cdots & -\sin\theta & \\
 & \vdots & \ddots & \vdots & \\
 & \sin\theta & \cdots & \cos\theta & \\
 & & & & 1
\end{pmatrix},
\qquad
\begin{aligned}
(G)_{ii} &= \cos\theta, & (G)_{ij} &= -\sin\theta,\\
(G)_{ji} &= \sin\theta, & (G)_{jj} &= \cos\theta,
\end{aligned}
$$

all other diagonal entries $1$, all other off-diagonal entries $0$. Positive
$\theta$ carries $e_i$ towards $e_j$:

$$
G_{ij}(\theta)\, e_i = \cos\theta\, e_i + \sin\theta\, e_j, \qquad
G_{ij}(\theta)\, e_k = e_k \quad (k \ne i, j).
$$

Properties (all unit-tested in `tests/rotation.test.js`):

- $G^{\mathsf T} G = I$ (orthonormal: lengths and angles are preserved),
- $\det G = +1$ (a proper rotation, no reflection),
- $G_{ij}(\alpha)\, G_{ij}(\beta) = G_{ij}(\alpha + \beta)$ (same plane: angles add),
- $G^{-1} = G^{\mathsf T} = G_{ij}(-\theta)$.

## How many planes?

There are $\binom{n}{2}$ coordinate planes: 1 in 2D, 3 in 3D (the familiar
three "axes"), **6 in 4D** ($xy, xz, yz, xw, yw, zw$), 10 in 5D, 15 in 6D,
21 in 7D. Three of the six 4D planes contain $w$ and are _new_: nothing in
3D prepares you for a rotation in $xw$. Those three are what the sliders and
Shift-drag control.

## Composition

A general rotation is a product of Givens rotations. In the app the full
$7 \times 7$ matrix is

$$
R = \underbrace{G_{\text{auto},m}\cdots G_{\text{auto},1}}_{\text{timeline spins}}\;
    \underbrace{G_{zw}(\gamma)\, G_{yw}(\beta)\, G_{xw}(\alpha)}_{\text{user}} ,
$$

applied as $x \mapsto R\,x$ to every vertex _before_ projection. Matrix
products do not commute, so the order is fixed: user rotation first, then
the timeline's automatic spins (`buildRotation` in `src/scene/frame.js`).
The basis panel in the UI shows the top-left $m \times m$ block of $R$ for
the $m$ currently existing axes — in 3D with no $w$-rotation it is the
identity, which is the point: the picture _is_ the matrix.

## Canonical poses

Every timeline spin is a full turn, $\theta: 0 \to 2\pi$, so at every stage
boundary the automatic part of $R$ is the identity. Before $w$ is collapsed
the user angles are eased back to $0$ as well. The reason is pedagogical: a
collapse is a projection along a _basis_ direction (see
[collapse.md](collapse.md)), and that only reads correctly when the object
is axis-aligned at the moment the basis vector disappears.
