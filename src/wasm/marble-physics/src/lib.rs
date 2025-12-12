use wasm_bindgen::prelude::*;


#[wasm_bindgen]
#[repr(C)]
#[derive(Clone, Copy, Debug)]
pub struct Marble {
    pub x: f64,
    pub y: f64,
    pub vx: f64,
    pub vy: f64,
    pub radius: f64,
    pub mass: f64,
}

#[wasm_bindgen]
pub struct PhysicsConfig {
    pub field_width: f64,
    pub field_height: f64,
    pub damping: f64,
    pub restitution: f64,
    pub wall_bounce: f64,
    pub min_speed: f64,
    pub max_speed: f64,
}

#[wasm_bindgen]
impl PhysicsConfig {
    pub fn new(
        field_width: f64,
        field_height: f64,
        damping: f64,
        restitution: f64,
        wall_bounce: f64,
        min_speed: f64,
        max_speed: f64,
    ) -> PhysicsConfig {
        PhysicsConfig {
            field_width,
            field_height,
            damping,
            restitution,
            wall_bounce,
            min_speed,
            max_speed,
        }
    }
}

#[wasm_bindgen]
pub struct PhysicsWorld {
    marbles: Vec<Marble>,
    config: PhysicsConfig,
}

#[wasm_bindgen]
impl PhysicsWorld {
    pub fn new(config: PhysicsConfig) -> PhysicsWorld {
        console_error_panic_hook::set_once();
        PhysicsWorld {
            marbles: Vec::new(),
            config,
        }
    }

    pub fn add_marble(&mut self, x: f64, y: f64, vx: f64, vy: f64, radius: f64, mass: f64) {
        self.marbles.push(Marble {
            x,
            y,
            vx,
            vy,
            radius,
            mass,
        });
    }

    pub fn clear_marbles(&mut self) {
        self.marbles.clear();
    }

    pub fn update_config(&mut self, config: PhysicsConfig) {
        self.config = config;
    }

    pub fn get_marbles_ptr(&self) -> *const Marble {
        self.marbles.as_ptr()
    }

    pub fn get_marbles_len(&self) -> usize {
        self.marbles.len()
    }

    pub fn step(&mut self, dt: f64) {
        let damping_factor = if self.config.damping < 1.0 {
            self.config.damping.powf(dt * 60.0)
        } else {
            1.0
        };

        // 1. Update positions and apply forces
        for marble in self.marbles.iter_mut() {
            // Damping
            if damping_factor != 1.0 {
                marble.vx *= damping_factor;
                marble.vy *= damping_factor;
            }

            let speed = (marble.vx * marble.vx + marble.vy * marble.vy).sqrt();

            // Min speed
            if speed > 0.0 && speed < self.config.min_speed {
                let scale = self.config.min_speed / speed;
                marble.vx *= scale;
                marble.vy *= scale;
            }

            // Max speed
            if speed > self.config.max_speed {
                let scale = self.config.max_speed / speed;
                marble.vx *= scale;
                marble.vy *= scale;
            }

            marble.x += marble.vx * dt;
            marble.y += marble.vy * dt;
        }

        // 2. Collisions (O(N^2)) - moved to Rust for speed
        // To avoid borrowing issues, we use indices
        let len = self.marbles.len();
        for i in 0..len {
            for j in (i + 1)..len {
                let (a, b) = {
                    let (left, right) = self.marbles.split_at_mut(j);
                    (&mut left[i], &mut right[0])
                };

                let dx = b.x - a.x;
                let dy = b.y - a.y;
                let dist_sq = dx * dx + dy * dy;
                let min_dist = a.radius + b.radius;
                
                if dist_sq < min_dist * min_dist {
                    let dist = dist_sq.sqrt().max(0.001);
                    let nx = dx / dist;
                    let ny = dy / dist;

                    let relative_velocity = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;

                    if relative_velocity < 0.0 {
                        let restitution = self.config.restitution;
                        let impulse = ((1.0 + restitution) * relative_velocity) / (a.mass + b.mass);
                        
                        a.vx -= impulse * b.mass * nx;
                        a.vy -= impulse * b.mass * ny;
                        b.vx += impulse * a.mass * nx;
                        b.vy += impulse * a.mass * ny;
                    }

                    // Position correction
                    let overlap = min_dist - dist + 0.5;
                    a.x -= nx * overlap * 0.5;
                    a.y -= ny * overlap * 0.5;
                    b.x += nx * overlap * 0.5;
                    b.y += ny * overlap * 0.5;
                }
            }
        }

        // 3. Boundaries
        for marble in self.marbles.iter_mut() {
            if marble.x - marble.radius < 0.0 {
                marble.x = marble.radius;
                if marble.vx < 0.0 { marble.vx *= -self.config.wall_bounce; }
            }
            if marble.x + marble.radius > self.config.field_width {
                marble.x = self.config.field_width - marble.radius;
                if marble.vx > 0.0 { marble.vx *= -self.config.wall_bounce; }
            }
            if marble.y - marble.radius < 0.0 {
                marble.y = marble.radius;
                if marble.vy < 0.0 { marble.vy *= -self.config.wall_bounce; }
            }
            if marble.y + marble.radius > self.config.field_height {
                marble.y = self.config.field_height - marble.radius;
                if marble.vy > 0.0 { marble.vy *= -self.config.wall_bounce; }
            }
        }
    }
}
