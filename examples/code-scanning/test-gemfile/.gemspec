Gem::Specification.new do |spec|
  spec.name          = "example_gem"
  spec.version       = "0.1.0"
  spec.authors       = ["Your Name"]
  spec.email         = ["your.email@example.com"]

  spec.summary       = "short summary"
  spec.description   = "description of gem"
  spec.homepage      = "http://example.com/gem"
  spec.license       = "UNLICENSED"

  # Specify which files should be added to the gem when it is released.
  spec.files         = `git ls-files -z`.split("\x0").reject do |f|
    f.match(%r{^(test|spec|features)/})
  end
  spec.bindir        = "exe"
  spec.executables   = spec.files.grep(%r{^exe/}) { |f| File.basename(f) }
  spec.require_paths = ["lib"]

  # Dependency declarations
  spec.add_runtime_dependency "rails", "~> 5"
  spec.add_development_dependency "rspec", "~> 3.0"
end
